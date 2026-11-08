// Philadelphia Waterfront court at night.
// Same scale, coordinates and camera as the other courts (hoop glass at z = 0, camera at z ≈ 11).
// Depth is built in layers, near to far:
//   1. street court and asphalt               (z  +25 … -9)
//   2. brick industrial buildings and the     (z   -9 … -40)
//      concrete retaining wall at the water
//   3. the Delaware River                     (z   -9 … -1500)
//   4. the Ben Franklin Bridge                (towers at about 400 m and 930 m, real proportions)
//   5. the lit Philadelphia skyline           (about 1.4 km)
// A phone held upright only sees about ±11° left and right of straight ahead, so every landmark
// is placed inside that strip. Lighting is baked: no real-time shadows here, and the river's
// reflections are painted on, which costs almost nothing.
import { THREE, canvasTexture, rng, noise, instancer, beam, v3, wirePoints, glowPoints, brick, skyGradient,
  groundAndCourt, streetLight, phillySkyline, phillyTowers, courtFloods } from "./kit.js";

export const id = "philly_waterfront";
export const name = "Waterfront";

const WATER_Y = -0.8, EDGE_Z = -9;
const BLUE = "#3d7cff", AMBER = "#ffb35a";

// ---------- river ----------
// Dark water with ripples and the long vertical shimmer of distant lights. The texture drifts
// slowly so the water looks alive.
function riverTexture(r) {
  const W = 512, H = 1024;
  return canvasTexture(W, H, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "#0c1630"); gr.addColorStop(0.7, "#0a1226"); gr.addColorStop(1, "#070c1a");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 2600; i++) {                       // ripples
      g.fillStyle = `rgba(120,150,210,${0.03 + r() * 0.08})`;
      g.fillRect(r() * W, r() * H, 6 + r() * 30, 1);
    }
    // reflections of the skyline and bridge lights: broken vertical streaks
    const cols = ["255,205,130", "160,200,255", "90,140,255", "255,230,190"];
    for (let i = 0; i < 110; i++) {
      const x = r() * W, c = cols[Math.floor(r() * cols.length)], len = 80 + r() * 380, y0 = r() * H * 0.6;
      for (let y = y0; y < y0 + len; y += 3 + r() * 5) {
        g.fillStyle = `rgba(${c},${(0.12 + r() * 0.4) * (1 - (y - y0) / len)})`;
        g.fillRect(x + (r() - 0.5) * 6, y, 2 + r() * 8, 1.5);
      }
    }
  }, { repeat: [3, 1] });
}

// ---------- industrial buildings ----------
function warehouseFront(r, { w, h, color, arches = 3, sign = null }) {
  const k = 40, W = Math.round(w * k), H = Math.round(h * k);
  return canvasTexture(W, H, (g) => {
    brick(g, 0, 0, W, H, color, r, k);
    noise(g, W, H, 4000, r, 0.14);
    g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, H - 0.9 * k, W, 0.9 * k);   // grime at the base
    g.fillStyle = "#2a2220"; g.fillRect(0, 0, W, 0.5 * k);                      // parapet
    const aw = (w - 2) / arches;
    for (let i = 0; i < arches; i++) {
      const x = (1 + i * aw + aw * 0.12) * k, ww = aw * 0.76 * k, y = 1.6 * k, hh = (h - 3.2) * k;
      g.fillStyle = "#3b302c";                                                  // brick arch surround
      g.beginPath(); g.moveTo(x - 6, y + hh); g.lineTo(x - 6, y + ww / 2); g.arc(x + ww / 2, y + ww / 2, ww / 2 + 6, Math.PI, 0); g.lineTo(x + ww + 6, y + hh); g.fill();
      const lit = r() < 0.55;
      const glass = g.createLinearGradient(0, y, 0, y + hh);
      if (lit) { glass.addColorStop(0, "#ffd08a"); glass.addColorStop(1, "#c97a3a"); } else { glass.addColorStop(0, "#1b2a4a"); glass.addColorStop(1, "#0b1222"); }
      g.fillStyle = glass;
      g.beginPath(); g.moveTo(x, y + hh); g.lineTo(x, y + ww / 2); g.arc(x + ww / 2, y + ww / 2, ww / 2, Math.PI, 0); g.lineTo(x + ww, y + hh); g.fill();
      g.strokeStyle = "#1a1412"; g.lineWidth = 3;                                // muntins
      for (let mx = 1; mx < 4; mx++) { g.beginPath(); g.moveTo(x + ww * mx / 4, y + ww * 0.15); g.lineTo(x + ww * mx / 4, y + hh); g.stroke(); }
      for (let my = y + ww / 2; my < y + hh; my += 0.7 * k) { g.beginPath(); g.moveTo(x, my); g.lineTo(x + ww, my); g.stroke(); }
    }
    if (sign) {
      g.fillStyle = "rgba(230,222,205,0.75)"; g.font = `bold ${0.7 * k}px Georgia, serif`; g.textAlign = "center";
      g.fillText(sign, W / 2, 1.25 * k);
    }
  });
}

function industrial(group, r) {
  const side = new THREE.MeshStandardMaterial({ color: 0x4a2a22, roughness: 1 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x1c1a1c, roughness: 1 });
  // Left: a long brick pier warehouse, its arched end wall facing the court.
  const wl = { w: 12, h: 7.5, d: 34 };
  const front = new THREE.MeshStandardMaterial({ map: warehouseFront(r, { w: wl.w, h: wl.h, color: "#6e3a2c", arches: 3, sign: "PIER 9" }), roughness: 0.95, emissive: 0xffffff, emissiveIntensity: 0.0 });
  const left = new THREE.Mesh(new THREE.BoxGeometry(wl.w, wl.h, wl.d), [side, side, roof, roof, front, side]);
  left.position.set(-4.2 - wl.w / 2, wl.h / 2, -16 - wl.d / 2);
  group.add(left);
  // Right: an old brick power house with a tall smokestack.
  const wr = { w: 10, h: 6, d: 18 };
  const front2 = new THREE.MeshStandardMaterial({ map: warehouseFront(r, { w: wr.w, h: wr.h, color: "#7d4231", arches: 2 }), roughness: 0.95 });
  const right = new THREE.Mesh(new THREE.BoxGeometry(wr.w, wr.h, wr.d), [side, side, roof, roof, front2, side]);
  right.position.set(5.0 + wr.w / 2, wr.h / 2, -20 - wr.d / 2);
  group.add(right);
  const stackTex = canvasTexture(64, 512, (g, W, H) => { brick(g, 0, 0, W, H, "#6a3326", r, 60); g.fillStyle = "#e9e5dc"; g.fillRect(0, 30, W, 18); });
  stackTex.wrapS = THREE.RepeatWrapping; stackTex.repeat.set(3, 1);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.1, 20, 16), new THREE.MeshStandardMaterial({ map: stackTex, roughness: 1 }));
  stack.position.set(7.6, 10, -27); group.add(stack);
  const blink = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3030 }));
  blink.position.set(7.6, 20.2, -27); group.add(blink);
  // Blue architectural uplight strips along the bases, washing the brick.
  const strip = new THREE.MeshBasicMaterial({ color: BLUE });
  for (const [x, z, w] of [[-4.2 - wl.w / 2, -15.9, wl.w], [5.0 + wr.w / 2, -19.9, wr.w]]) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), strip); s.position.set(x, 0.1, z); group.add(s);
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(w, 4.5), new THREE.MeshBasicMaterial({
      map: canvasTexture(16, 128, (g, W, H) => { const gr = g.createLinearGradient(0, H, 0, 0); gr.addColorStop(0, "rgba(255,255,255,0.75)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); }, { srgb: false }),
      color: new THREE.Color(BLUE).multiplyScalar(0.55), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    wash.position.set(x, 2.25, z + 0.06); group.add(wash);
  }
}

// ---------- the Ben Franklin Bridge ----------
// Its look: blue steel, two tall lattice towers with big X bracing between the legs, an arched
// crown on top, a deep stiffening truss under the deck, and white lights strung along the cables.
// Real dimensions: towers 117 m, deck 41 m above the water, main span 533 m, side spans 218 m.
const DECK_Y = 41, TOWER_H = 117, LEG_GAP = 32, MAIN_SPAN = 533, SIDE_SPAN = 218;

function bridge(group, r) {
  const steel = new THREE.MeshStandardMaterial({ color: 0x2f63b8, emissive: 0x1b4aa8, emissiveIntensity: 0.55, roughness: 0.55, metalness: 0.35, fog: true });
  const members = instancer(new THREE.BoxGeometry(1, 1, 1), steel, { shadows: false });

  // The bridge runs across the view from near-left to far-right.
  const A = v3(-50, 0, -390);                                  // near tower base (on the water)
  const along = new THREE.Vector3(104, 0, -522).normalize();   // heading away and to the right
  const B = A.clone().addScaledVector(along, MAIN_SPAN);       // far tower, ~1 km away
  const across = new THREE.Vector3(-along.z, 0, along.x);      // horizontal, perpendicular to the deck
  const anchorA = A.clone().addScaledVector(along, -SIDE_SPAN), anchorB = B.clone().addScaledVector(along, SIDE_SPAN);

  function tower(base) {
    const legs = [-1, 1].map(s => base.clone().addScaledVector(across, s * LEG_GAP / 2));
    for (const L of legs) beam(members, v3(L.x, WATER_Y, L.z), v3(L.x, TOWER_H, L.z), 5.5, 6.5);   // legs
    const levels = [DECK_Y - 4, DECK_Y + 22, DECK_Y + 48, TOWER_H - 6];
    for (const y of levels) beam(members, v3(legs[0].x, y, legs[0].z), v3(legs[1].x, y, legs[1].z), 2.6, 4);  // struts
    for (let i = 0; i < levels.length - 1; i++) {                                                     // big X bracing
      const y0 = levels[i] + 1, y1 = levels[i + 1] - 1;
      beam(members, v3(legs[0].x, y0, legs[0].z), v3(legs[1].x, y1, legs[1].z), 1.3, 2.4);
      beam(members, v3(legs[1].x, y0, legs[1].z), v3(legs[0].x, y1, legs[0].z), 1.3, 2.4);
    }
    // arched crown across the top
    const mid = base.clone(); let prev = null;
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, s = t * 2 - 1;
      const p = mid.clone().addScaledVector(across, s * LEG_GAP / 2); p.y = TOWER_H + 5 * (1 - s * s);
      if (prev) beam(members, prev, p, 2, 3);
      prev = p;
    }
    // below the deck: a lower strut and the piers in the water
    beam(members, v3(legs[0].x, 8, legs[0].z), v3(legs[1].x, 8, legs[1].z), 3, 4);
    const pier = new THREE.Mesh(new THREE.BoxGeometry(LEG_GAP + 12, 6, 14), new THREE.MeshStandardMaterial({ color: 0x3a3c44, roughness: 1 }));
    pier.position.set(base.x, WATER_Y + 2, base.z); pier.rotation.y = -Math.atan2(along.z, along.x) + Math.PI / 2; group.add(pier);
    return legs;
  }
  const legsA = tower(A), legsB = tower(B);

  // Deck with its deep stiffening truss, on both sides.
  const deckPts = (s) => [anchorA, anchorB].map(p => p.clone().addScaledVector(across, s * (LEG_GAP / 2 - 3)));
  for (const s of [-1, 1]) {
    const [p0, p1] = deckPts(s);
    beam(members, v3(p0.x, DECK_Y, p0.z), v3(p1.x, DECK_Y, p1.z), 1.2, 1.2);            // top chord
    beam(members, v3(p0.x, DECK_Y - 8, p0.z), v3(p1.x, DECK_Y - 8, p1.z), 1.2, 1.2);    // bottom chord
    const n = 80;
    for (let i = 0; i < n; i++) {                                                     // diagonals (Warren truss)
      const a = new THREE.Vector3().lerpVectors(p0, p1, i / n), b = new THREE.Vector3().lerpVectors(p0, p1, (i + 1) / n);
      beam(members, v3(a.x, i % 2 ? DECK_Y : DECK_Y - 8, a.z), v3(b.x, i % 2 ? DECK_Y - 8 : DECK_Y, b.z), 0.6, 0.6);
    }
  }
  const deckMid = new THREE.Vector3().lerpVectors(anchorA, anchorB, 0.5);
  const deckLen = anchorA.distanceTo(anchorB);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(LEG_GAP - 4, 1.2, deckLen), new THREE.MeshStandardMaterial({ color: 0x1a2236, roughness: 1 }));
  deck.position.set(deckMid.x, DECK_Y + 0.6, deckMid.z); deck.rotation.y = -Math.atan2(along.z, along.x) + Math.PI / 2;
  group.add(deck);
  // Approaches down to the anchorages.
  for (const an of [anchorA, anchorB]) {
    const block = new THREE.Mesh(new THREE.BoxGeometry(LEG_GAP + 10, DECK_Y + 4, 30), new THREE.MeshStandardMaterial({ color: 0x4a443e, roughness: 1 }));
    block.position.set(an.x, (DECK_Y + 4) / 2 + WATER_Y, an.z); block.rotation.y = deck.rotation.y; group.add(block);
  }
  group.add(members.build());

  // Main cables: anchorage → tower top → sag → tower top → anchorage, with suspenders and lights.
  const cableMat = new THREE.LineBasicMaterial({ color: 0x9fb8ff, fog: true });
  const lights = [], hangers = [];
  for (const s of [-1, 1]) {
    const off = p => p.clone().addScaledVector(across, s * LEG_GAP / 2);
    const tA = off(A), tB = off(B); tA.y = tB.y = TOWER_H;
    const aA = off(anchorA), aB = off(anchorB); aA.y = aB.y = DECK_Y + 2;
    const spans = [[aA, tA, 18], [tA, tB, TOWER_H - DECK_Y - 4], [tB, aB, 18]];
    for (const [p, q, sag] of spans) {
      // a cable that hangs to `sag` below the straight line between its ends at the middle
      const pts = wirePoints(p, q, sag, 48);
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), cableMat));
      pts.forEach((pt, i) => {
        if (i % 2 === 0) lights.push(pt.clone());
        if (i % 3 === 0 && pt.y > DECK_Y + 1.5) hangers.push(pt.clone(), v3(pt.x, DECK_Y + 0.5, pt.z));
      });
    }
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(hangers), new THREE.LineBasicMaterial({ color: 0x6f8fd8, transparent: true, opacity: 0.55, fog: true })));
  group.add(glowPoints(lights, 0xffffff, 3.2));
  // Tower floodlights and deck lamps.
  const towerLights = [];
  for (const legs of [legsA, legsB]) for (const L of legs) for (let y = DECK_Y + 6; y < TOWER_H; y += 9) towerLights.push(v3(L.x, y, L.z + 3.4));
  group.add(glowPoints(towerLights, 0x8fb6ff, 2.4));
  const deckLamps = [];
  for (const s of [-1, 1]) { const [p0, p1] = deckPts(s); for (let i = 0; i <= 60; i++) { const p = new THREE.Vector3().lerpVectors(p0, p1, i / 60); deckLamps.push(v3(p.x, DECK_Y + 2.2, p.z)); } }
  group.add(glowPoints(deckLamps, 0xffc27a, 2.2));
}

// ---------- build ----------

export function build() {
  const group = new THREE.Group();
  const r = rng(77);

  // 1. A regular street court: dark asphalt with a painted court and clean white lines,
  //    ending at the river wall.
  groundAndCourt(group, {
    size: [80, 36], z: EDGE_Z + 18, color: "#35373c", seed: 21, roughness: 0.85, shadows: false,
    pave: { patches: 0, darks: 0, cracks: 22 },
    lines: { surface: { color: "#26354f", alpha: 0.55 }, paint: "#2f5fa8", paintAlpha: 0.65, line: "#eef2f6", lineAlpha: 0.85, wear: 12, seed: 9 },
  });

  // 2. Retaining wall at the water's edge, with a steel rail on top.
  const concrete = canvasTexture(512, 64, (g, W, H) => {
    g.fillStyle = "#6b6e72"; g.fillRect(0, 0, W, H); noise(g, W, H, 6000, r, 0.2);
    g.fillStyle = "rgba(20,24,30,0.35)"; for (let x = 0; x < W; x += 64) g.fillRect(x, 0, 2, H);   // panel joints
    for (let i = 0; i < 40; i++) { g.fillStyle = "rgba(30,32,30,0.25)"; g.fillRect(r() * W, 0, 2 + r() * 10, H * (0.4 + r() * 0.6)); }  // stains
  }, { repeat: [8, 1] });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(90, 1.0 - WATER_Y, 0.7), new THREE.MeshStandardMaterial({ map: concrete, roughness: 0.95 }));
  wall.position.set(0, (1.0 + WATER_Y) / 2, EDGE_Z); group.add(wall);
  const railMat = new THREE.MeshStandardMaterial({ color: 0x5f6670, roughness: 0.4, metalness: 0.7 });
  const rails = instancer(new THREE.BoxGeometry(1, 1, 1), railMat, { shadows: false });
  beam(rails, v3(-45, 2.05, EDGE_Z), v3(45, 2.05, EDGE_Z), 0.06);
  beam(rails, v3(-45, 1.6, EDGE_Z), v3(45, 1.6, EDGE_Z), 0.04);
  for (let x = -45; x <= 45; x += 2) beam(rails, v3(x, 1.0, EDGE_Z), v3(x, 2.05, EDGE_Z), 0.05);
  group.add(rails.build());


  industrial(group, r);

  // Amber street lights along the promenade.
  for (const [x, z, flip] of [[-3.6, -7.6, false], [3.9, -7.6, true]]) {
    group.add(streetLight(x, z, flip, AMBER, 6.5));
    const lamp = new THREE.PointLight(AMBER, 6, 16, 1.5);
    lamp.position.set(x + (flip ? -1.05 : 1.05), 6.2, z); group.add(lamp);
  }

  // 3. The river.
  const riverTex = riverTexture(r);
  const river = new THREE.Mesh(new THREE.PlaneGeometry(3000, 1320), new THREE.MeshBasicMaterial({ map: riverTex, fog: true }));
  river.rotation.x = -Math.PI / 2; river.position.set(0, WATER_Y, EDGE_Z - 660);
  group.add(river);
  // Far shore: a low band of lit waterfront buildings under the skyline.
  const shoreTex = canvasTexture(1024, 64, (g, W, H) => {
    g.fillStyle = "#0a0f1e"; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.7 ? "rgba(255,200,130,0.9)" : "rgba(170,205,255,0.9)"; g.fillRect(r() * W, 10 + r() * (H - 14), 2, 2); }
  });
  const shore = new THREE.Mesh(new THREE.PlaneGeometry(3000, 34), new THREE.MeshBasicMaterial({ map: shoreTex, fog: false, color: 0xbbbbbb }));
  shore.position.set(0, WATER_Y + 17, -1330); group.add(shore);

  // 4. The Ben Franklin Bridge.
  bridge(group, r);

  // 5. Skyline behind the bridge.
  phillySkyline(group, phillyTowers(30, -1400, 0.95), { r, fog: false, dim: 0.92 });

  // Night light: cool moonlight and city glow. No real-time shadows.
  group.add(new THREE.HemisphereLight(0x6a82c4, 0x2a2430, 1.15));
  const moon = new THREE.DirectionalLight(0xb4c4ff, 0.9);
  moon.position.set(-30, 40, 30); group.add(moon);
  for (const [x, z] of [[-5.6, -11.5], [6.4, -15.5]]) {               // amber light on the brick fronts
    const l = new THREE.PointLight(AMBER, 14, 16, 1.2); l.position.set(x, 4.5, z); group.add(l);
  }
  courtFloods(group, { color: 0xfff0dc, intensity: 2.0 });   // the court itself is lit for play
  const blueWash = new THREE.PointLight(BLUE, 7, 26, 1.2);   // blue architectural light on the court side of the wall
  blueWash.position.set(0, 4, -12); group.add(blueWash);

  return {
    group,
    background: skyGradient([[0, "#050a1a"], [0.45, "#0f1c42"], [0.72, "#24285a"], [0.88, "#4a3a62"], [1, "#5e4560"]]),
    fog: new THREE.Fog(0x101a36, 160, 2400),
    shooterTint: 0xe8edf8,
    exposure: 1.55,
    shadows: false,
    ballGlow: 0.55,
    update(dt) { riverTex.offset.y = (riverTex.offset.y + dt * 0.004) % 1; },
  };
}
