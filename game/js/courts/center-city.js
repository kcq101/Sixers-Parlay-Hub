// Philadelphia Center City court at night, with City Hall as the focal point.
// Same scale, coordinates and camera as the other courts (hoop glass at z = 0, camera at z ≈ 11).
// Layers, near to far: worn park court → stone wall with wrought-iron fence, vintage lamps,
// park trees → plaza → City Hall (about 430 m away, tower centred behind the hoop so the clock
// and William Penn rise above the backboard; about 440 m away) → lit skyscrapers behind and beside it.
// City Hall is lit by its own glow (baked into its materials) rather than real lights.
import { THREE, canvasTexture, rng, noise, instancer, beam, v3, glowPoints, skyGradient,
  groundAndCourt, vintageLamp, lightPool, phillySkyline, phillyTowers, courtFloods } from "./kit.js";

export const id = "philly_center_city";
export const name = "Center City";

const CH_Z = -430;              // City Hall's front face
const STONE = "#d9ccb3", FLOOD = 0xffd6a0;

// ---------- City Hall ----------

// Facade texture: rusticated ground floor, rows of arched windows between paired pilasters,
// cornices between floors. Some windows lit.
function facadeTex(r, { w, h, floors = 4, bays }) {
  const k = 6, W = Math.round(w * k), H = Math.round(h * k);
  return canvasTexture(W, H, (g) => {
    g.fillStyle = STONE; g.fillRect(0, 0, W, H);
    noise(g, W, H, Math.round(W * H / 40), r, 0.08);
    const fh = h / floors;
    g.fillStyle = "rgba(90,70,50,0.25)";                                 // rustication lines on the base
    for (let y = H - fh * k; y < H; y += 0.9 * k) g.fillRect(0, y, W, 1.2);
    const bw = w / bays;
    for (let f = 0; f < floors; f++) {
      const y0 = H - (f + 1) * fh * k;
      g.fillStyle = "rgba(120,96,70,0.55)"; g.fillRect(0, y0, W, 0.5 * k);   // cornice
      for (let b = 0; b < bays; b++) {
        const x = b * bw * k;
        g.fillStyle = "rgba(150,124,94,0.5)";                            // paired pilasters
        g.fillRect(x + 0.1 * k, y0 + 0.5 * k, 0.5 * k, (fh - 0.5) * k);
        g.fillRect(x + 0.75 * k, y0 + 0.5 * k, 0.5 * k, (fh - 0.5) * k);
        const ww = bw * 0.42 * k, wx = x + bw * k / 2 - ww / 2 + 0.3 * k, wy = y0 + fh * k * 0.3, wh = fh * k * 0.55;
        const lit = r() < 0.4;
        g.fillStyle = lit ? "#ffcf8c" : "#2a2f40";
        g.beginPath(); g.moveTo(wx, wy + wh); g.lineTo(wx, wy + ww / 2); g.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0); g.lineTo(wx + ww, wy + wh); g.fill();
      }
    }
  });
}

// Mansard roof band with dormers painted on.
function mansardTex(r, w) {
  const k = 6, W = Math.round(w * k), H = 10 * k;
  return canvasTexture(W, H, (g) => {
    g.fillStyle = "#4c5560"; g.fillRect(0, 0, W, H);                      // slate
    for (let y = 0; y < H; y += 6) { g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(0, y, W, 1); }
    for (let x = 2 * k; x < W - 2 * k; x += 5 * k) {
      g.fillStyle = STONE; g.fillRect(x, H * 0.3, 2.2 * k, H * 0.6);        // dormer
      g.beginPath(); g.moveTo(x - 0.3 * k, H * 0.32); g.lineTo(x + 1.1 * k, H * 0.12); g.lineTo(x + 2.5 * k, H * 0.32); g.fill();
      g.fillStyle = r() < 0.4 ? "#ffcf8c" : "#2a2f40"; g.fillRect(x + 0.5 * k, H * 0.42, 1.2 * k, H * 0.4);
    }
  });
}

// Clock face with hands, glowing.
function clockTex() {
  return canvasTexture(256, 256, (g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.fillStyle = "#3a2c1a"; g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, 7); g.fill();       // bronze ring
    g.fillStyle = "#fff6dc"; g.beginPath(); g.arc(W / 2, H / 2, W * 0.44, 0, 7); g.fill();
    g.strokeStyle = "#2a2014"; g.lineCap = "round";
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2; g.lineWidth = 6;
      g.beginPath(); g.moveTo(W / 2 + Math.sin(a) * W * 0.36, H / 2 - Math.cos(a) * W * 0.36); g.lineTo(W / 2 + Math.sin(a) * W * 0.42, H / 2 - Math.cos(a) * W * 0.42); g.stroke();
    }
    g.lineWidth = 9; g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(W / 2 + W * 0.2, H / 2 - W * 0.12); g.stroke();   // hour
    g.lineWidth = 6; g.beginPath(); g.moveTo(W / 2, H / 2); g.lineTo(W / 2 - W * 0.05, H / 2 - W * 0.34); g.stroke();  // minute
  });
}

function cityHall(group, r) {
  const lit = (map, extra = {}) => new THREE.MeshStandardMaterial({ map, emissive: FLOOD, emissiveMap: map, emissiveIntensity: 0.8, roughness: 0.9, ...extra });
  const stoneFlat = new THREE.MeshStandardMaterial({ color: STONE, emissive: FLOOD, emissiveIntensity: 0.5, roughness: 0.9 });
  const slate = new THREE.MeshStandardMaterial({ color: 0x3e4650, emissive: 0x1a2030, emissiveIntensity: 0.4, roughness: 0.8 });

  // Main block: wings between corner pavilions and a centre pavilion.
  const W = 150, H = 40, D = 140;
  const wingTex = facadeTex(r, { w: 50, h: H, floors: 4, bays: 10 });
  wingTex.wrapS = THREE.RepeatWrapping;
  const wingMat = lit(wingTex);
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [stoneFlat, stoneFlat, slate, slate, wingMat, stoneFlat]);
  wingTex.repeat.set(W / 50, 1);
  body.position.set(0, H / 2, CH_Z - D / 2); group.add(body);
  // Mansard band along the top of the front.
  const mTex = mansardTex(r, W);
  const mansard = new THREE.Mesh(new THREE.BoxGeometry(W - 4, 9, 6), [slate, slate, slate, slate, lit(mTex, { emissiveIntensity: 0.35 }), slate]);
  mansard.position.set(0, H + 4.5, CH_Z - 3); mansard.rotation.x = -0.18; group.add(mansard);

  // Pavilions: taller blocks with steep mansard domes.
  const pavTex = facadeTex(r, { w: 20, h: 50, floors: 5, bays: 4 });
  for (const [x, w, h] of [[-66, 20, 50], [66, 20, 50], [0, 34, 56]]) {
    const pav = new THREE.Mesh(new THREE.BoxGeometry(w, h, 24), [stoneFlat, stoneFlat, slate, slate, lit(pavTex), stoneFlat]);
    pav.position.set(x, h / 2, CH_Z + 2); group.add(pav);
    // curved, square-plan mansard dome (a lathe with four sides)
    const prof = [[0.64, 0], [0.62, 0.12], [0.55, 0.45], [0.43, 0.75], [0.3, 0.95], [0.26, 1.0]].map(([rr, yy]) => new THREE.Vector2(w * rr, yy * 14));
    const dome = new THREE.Mesh(new THREE.LatheGeometry(prof, 4), slate);
    dome.rotation.y = Math.PI / 4; dome.position.set(x, h, CH_Z + 2); group.add(dome);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 1.2, w * 0.4), stoneFlat);
    crest.position.set(x, h + 14.6, CH_Z + 2); group.add(crest);
  }

  // The tower: square stone shaft with corner buttresses, clock stage, octagonal lantern,
  // dome, and the statue of William Penn on top (167 m to the hat).
  const TZ = CH_Z - 6, TW = 28;
  // Heights follow the real tower: stone shaft to ~100 m, clock stage to 118 m (clock centres
  // near 109 m), columned lantern, dome, and the statue from ~153 m to the hat at ~165 m.
  const shaftTex = facadeTex(r, { w: TW, h: 44, floors: 5, bays: 3 });
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(TW, 44, TW), lit(shaftTex));
  shaft.position.set(0, 56 + 22, TZ); group.add(shaft);
  const parts = instancer(new THREE.BoxGeometry(1, 1, 1), stoneFlat, { shadows: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) beam(parts, v3(sx * (TW / 2 - 1), 56, TZ + sz * (TW / 2 - 1)), v3(sx * (TW / 2 - 1), 118, TZ + sz * (TW / 2 - 1)), 3.6, 3.6);  // corner buttresses
  for (const y of [70, 85, 100]) beam(parts, v3(-TW / 2 - 0.8, y, TZ + TW / 2 + 0.6), v3(TW / 2 + 0.8, y, TZ + TW / 2 + 0.6), 1.2, 1.4);  // string courses
  // Clock stage (the metal part of the tower) with a glowing 7.9 m clock on each face, a curved
  // hood over each clock, and columns at the corners. Clock centres at 110 m.
  const clockStage = new THREE.Mesh(new THREE.BoxGeometry(TW - 2, 18, TW - 2), stoneFlat);
  clockStage.position.set(0, 110, TZ); group.add(clockStage);
  const clockMat = new THREE.MeshBasicMaterial({ map: clockTex(), transparent: true, color: 0xfff3d6 });
  const half = (TW - 2) / 2 + 0.08;
  const hoods = instancer(new THREE.CylinderGeometry(5.3, 5.3, 1.6, 20, 1, true, -Math.PI / 2, Math.PI), stoneFlat, { shadows: false });
  for (const [x, z, ry] of [[0, TZ + half, 0], [half, TZ, Math.PI / 2], [-half, TZ, -Math.PI / 2]]) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(3.95, 40), clockMat);
    face.position.set(x, 110, z); face.rotation.y = ry; group.add(face);
    hoods.add(x + Math.sin(ry) * 0.6, 110.4, z + Math.cos(ry) * 0.6, Math.PI / 2, ry, 0);
  }
  group.add(hoods.build());
  const corner = instancer(new THREE.CylinderGeometry(0.9, 1.0, 18, 10), stoneFlat, { shadows: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) corner.add(sx * (TW / 2 - 1.2), 110, TZ + sz * (TW / 2 - 1.2));
  group.add(corner.build());
  beam(parts, v3(-TW / 2 - 0.4, 119.4, TZ + TW / 2 - 0.6), v3(TW / 2 + 0.4, 119.4, TZ + TW / 2 - 0.6), 1.8, 1.8);   // cornice
  const pin = instancer(new THREE.ConeGeometry(1.2, 6, 6), stoneFlat, { shadows: false });                          // corner pinnacles
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) pin.add(sx * (TW / 2 - 1.5), 123.3, TZ + sz * (TW / 2 - 1.5));
  group.add(pin.build());
  // Octagonal colonnade (the observation level tops out near 138 m), lit warm inside.
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 9.2, 17, 8), new THREE.MeshStandardMaterial({ color: 0x6a5a40, emissive: 0xffb860, emissiveIntensity: 0.95, roughness: 0.7 }));
  lantern.position.set(0, 129, TZ); lantern.rotation.y = Math.PI / 8; group.add(lantern);
  const cols = instancer(new THREE.CylinderGeometry(0.5, 0.6, 15.5, 8), stoneFlat, { shadows: false });
  for (let i = 0; i < 16; i++) { const a2 = (i + 0.5) / 16 * Math.PI * 2; cols.add(Math.cos(a2) * 9.7, 129, TZ + Math.sin(a2) * 9.7); }
  group.add(cols.build());
  for (const [y, rr] of [[120.6, 11], [137.6, 10.8]]) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 1.2, 16), stoneFlat); ring.position.set(0, y, TZ); group.add(ring);
  }
  // Bell-shaped dome up to the statue's base at 155.8 m, with a ring of small dormers.
  const gold = new THREE.MeshStandardMaterial({ color: 0x9a8058, emissive: 0xffc070, emissiveIntensity: 0.5, roughness: 0.6, metalness: 0.4 });
  const domeProf = [[9.8, 0], [10, 0.8], [9.6, 2.4], [8.6, 4.8], [7.2, 7.4], [5.6, 9.8], [4.1, 12], [3.0, 13.8], [2.5, 15.2], [2.4, 17.6]].map(([rr, yy]) => new THREE.Vector2(rr, yy));
  const dome = new THREE.Mesh(new THREE.LatheGeometry(domeProf, 16), gold); dome.position.set(0, 138.2, TZ); group.add(dome);
  const dormers = instancer(new THREE.BoxGeometry(1.6, 2.2, 1.2), stoneFlat, { shadows: false });
  for (let i = 0; i < 8; i++) { const a2 = i / 8 * Math.PI * 2; dormers.add(Math.cos(a2) * 8.4, 143.2, TZ + Math.sin(a2) * 8.4, 0, -a2 + Math.PI / 2, 0); }
  group.add(dormers.build());
  // William Penn, 11.3 m tall, facing out over the city with an outstretched arm.
  const bronze = new THREE.MeshStandardMaterial({ color: 0x3a2e22, emissive: 0x6a4a28, emissiveIntensity: 0.35, roughness: 0.6, metalness: 0.5 });
  const S0 = 155.8;
  const coat = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.8, 7.0, 10), bronze); coat.position.set(0, S0 + 3.5, TZ); group.add(coat);
  const shoulders = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), bronze); shoulders.scale.set(1.2, 0.8, 0.9); shoulders.position.set(0, S0 + 7.1, TZ); group.add(shoulders);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 8), bronze); head.position.set(0, S0 + 8.5, TZ); group.add(head);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.18, 14), bronze); brim.position.set(0, S0 + 9.1, TZ); group.add(brim);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.68, 1.6, 10), bronze); crown.position.set(0, S0 + 10.0, TZ); group.add(crown);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 3.0, 8), bronze);
  arm.position.set(1.5, S0 + 6.0, TZ + 0.6); arm.rotation.z = -1.0; group.add(arm);
  group.add(parts.build());

  // Warm floodlight glow at the foot of the building.
  group.add(glowPoints(Array.from({ length: 40 }, (_, i) => v3(-74 + i * 3.8, 1, CH_Z + 15)), 0xffd09a, 4));
}

// ---------- the park around the court ----------

function park(group, r) {
  // Low granite wall behind the court with a wrought-iron fence on top.
  const granite = canvasTexture(512, 64, (g, W, H) => {
    g.fillStyle = "#8b8780"; g.fillRect(0, 0, W, H);
    noise(g, W, H, 8000, r, 0.22);
    g.fillStyle = "rgba(40,38,36,0.6)";
    for (let y = 0; y < H; y += 21) g.fillRect(0, y, W, 2);
    for (let row = 0, y = 0; y < H; y += 21, row++) for (let x = (row % 2) * 32; x < W; x += 64) g.fillRect(x, y, 2, 21);
  }, { repeat: [10, 1] });
  const WALL_Z = -6, WALL_H = 1.0, SPAN = 32;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(SPAN, WALL_H, 0.7), new THREE.MeshStandardMaterial({ map: granite, roughness: 0.9 }));
  wall.position.set(0, WALL_H / 2, WALL_Z); group.add(wall);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(SPAN + 0.2, 0.12, 0.85), new THREE.MeshStandardMaterial({ color: 0xa29d94, roughness: 0.8 }));
  cap.position.set(0, WALL_H + 0.06, WALL_Z); group.add(cap);
  const iron = new THREE.MeshStandardMaterial({ color: 0x121317, roughness: 0.5, metalness: 0.7 });
  const pickets = instancer(new THREE.BoxGeometry(0.03, 1.6, 0.03), iron, { shadows: false });
  const tips = instancer(new THREE.ConeGeometry(0.045, 0.16, 6), iron, { shadows: false });
  const top = WALL_H + 0.12;
  for (let x = -SPAN / 2; x <= SPAN / 2; x += 0.14) { pickets.add(x, top + 0.8, WALL_Z); tips.add(x, top + 1.68, WALL_Z); }
  group.add(pickets.build(), tips.build());
  const rails = instancer(new THREE.BoxGeometry(1, 1, 1), iron, { shadows: false });
  for (const y of [top + 0.12, top + 1.45]) beam(rails, v3(-SPAN / 2, y, WALL_Z), v3(SPAN / 2, y, WALL_Z), 0.04, 0.05);
  for (let x = -SPAN / 2; x <= SPAN / 2; x += 2.4) beam(rails, v3(x, top, WALL_Z), v3(x, top + 1.85, WALL_Z), 0.08);   // posts
  group.add(rails.build());

  // Trees: trunks and leafy crowns, instanced. Kept to the sides so City Hall stays clear.
  const bark = new THREE.MeshStandardMaterial({ color: 0x2e241c, roughness: 1 });
  const leaves = new THREE.MeshStandardMaterial({ color: 0x3a6a44, emissive: 0x0e2216, emissiveIntensity: 1, roughness: 0.95, flatShading: true });
  const trunks = instancer(new THREE.CylinderGeometry(0.16, 0.26, 1, 7), bark, { shadows: false });
  const crowns = instancer(new THREE.IcosahedronGeometry(1, 1), leaves, { shadows: false });
  const trees = [[-6.2, -10.5, 6.5], [6.6, -11.5, 7], [-8.8, -24, 9], [9.4, -26, 9], [-12, -46, 10], [12.6, -50, 10], [-16, -80, 11], [16.5, -86, 11],
    [-21, -125, 12], [21, -130, 12], [-27, -180, 12], [27, -185, 12]];
  for (const [x, z, h] of trees) {
    trunks.add(x, h * 0.3, z, 0, 0, 0, 1, h * 0.6, 1);
    for (let i = 0; i < 4; i++) {
      const s = h * (0.26 + r() * 0.1);
      crowns.add(x + (r() - 0.5) * h * 0.3, h * (0.66 + r() * 0.2), z + (r() - 0.5) * h * 0.3, r() * 3, r() * 3, 0, s, s * 0.85, s);
    }
  }
  group.add(trunks.build(), crowns.build());

  // Hedges and planters along the inside of the wall.
  const hedge = instancer(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x1f3a26, roughness: 1 }), { shadows: false });
  for (const x of [-12, -7.5, 7.5, 12]) hedge.add(x, 0.55, WALL_Z - 1.4, 0, 0, 0, 3.6, 1.1, 1.2);
  group.add(hedge.build());

  // Vintage lamps: two real lights by the court, more along the path toward City Hall.
  for (const [x, z] of [[-3.3, -5.2], [3.5, -5.2]]) {
    group.add(vintageLamp(x, z));
    const l = new THREE.PointLight(0xffc98a, 7, 15, 1.4); l.position.set(x, 4.2, z); group.add(l);
    lightPool(group, x, z + 1.0, "#ffc98a", { radius: 3.8, strength: 0.32 });
  }
  for (const [x, z] of [[-7.5, -36], [7.8, -38], [-10.5, -64], [10.8, -66], [-14, -100], [14.5, -104]]) group.add(vintageLamp(x, z));
}

// ---------- build ----------

export function build() {
  const group = new THREE.Group();
  const r = rng(303);

  // Worn green park court with a red key.
  groundAndCourt(group, {
    size: [60, 40], z: 2, color: "#3c403f", seed: 31, roughness: 0.85, shadows: false,
    lines: { surface: { color: "#2f5c4a", alpha: 0.55 }, paint: "#8c3a30", paintAlpha: 0.55, line: "#efe9dd", lineAlpha: 0.7, seed: 13, wear: 220 },
  });
  // Plaza and streets out to City Hall.
  const plazaTex = canvasTexture(512, 512, (g, W, H) => {
    g.fillStyle = "#24272d"; g.fillRect(0, 0, W, H); noise(g, W, H, 20000, r, 0.12);
    g.fillStyle = "rgba(255,220,170,0.05)"; for (let y = 0; y < H; y += 32) g.fillRect(0, y, W, 2);
  }, { repeat: [10, 40] });
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(600, 900), new THREE.MeshStandardMaterial({ map: plazaTex, roughness: 0.95 }));
  plaza.rotation.x = -Math.PI / 2; plaza.position.set(0, -0.02, -18 - 450); group.add(plaza);

  park(group, r);
  cityHall(group, r);

  // Mid-rise blocks framing the plaza, then skyscrapers behind and beside City Hall.
  phillySkyline(group, [
    { x: -102, z: -330, h: 70, w: 40, lit: 0.5 }, { x: 108, z: -320, h: 82, w: 44, lit: 0.5 },
    { x: -150, z: -400, h: 110, w: 36, lit: 0.45 }, { x: 156, z: -390, h: 96, w: 40, lit: 0.45 },
  ], { r, fog: true, dim: 0.95 });
  phillySkyline(group, phillyTowers(0, -900, 1.25).filter(t => Math.abs(t.x) > 40), { r, fog: true, dim: 1.0 });

  // Night light: deep blue sky light, a little moon, warm lamps (above). No real-time shadows.
  group.add(new THREE.HemisphereLight(0x5e7cc4, 0x2a2630, 1.15));
  const moon = new THREE.DirectionalLight(0xb8c8ff, 0.85);
  courtFloods(group, { color: 0xfff0dc, intensity: 2.0 });   // the court itself is lit for play
  moon.position.set(30, 50, 40); group.add(moon);

  return {
    group,
    background: skyGradient([[0, "#06102a"], [0.4, "#10225a"], [0.7, "#1e3672"], [0.88, "#34477c"], [1, "#58547a"]]),
    fog: new THREE.Fog(0x1a2748, 120, 1700),
    shooterTint: 0xeaeef8,
    exposure: 1.55,
    shadows: false,
    ballGlow: 0.55,
  };
}
