// South Philly Street Court, at sunset. Built from Kevin's scene spec (id "philly_south_street").
// A court module returns { group, background, fog, shooterTint, shadows } and knows nothing about
// the ball, hoop, shooter or UI, so courts can be swapped freely.
//
// Coordinates follow the game: hoop glass at z = 0, the shooter near z = 4.7, camera behind him.
// The spec was laid out for a wide screen. On a phone held upright only a narrow strip behind
// the hoop is visible, so a few things are pulled toward the middle to stay in view
// (noted next to each one). The camera stays where Kevin set it in config.js.
import * as THREE from "../../vendor/three.module.min.js";
import { canvasTexture, rng, noise, DECAL } from "../util.js";
import { brick, instancer, wire, courtFloods } from "./kit.js";
import { HOOP } from "../physics.js";

export const id = "philly_south_street";
export const name = "South Philly Street Court";

const SPEC = {
  background: "#493b62",
  fog: { color: "#a66b67", near: 35, far: 100 },
  ground: { size: [42, 65], z: -12, color: "#514b48" },
  rowhouses: [
    { x: -12, z: -17, count: 5, height: 12, color: "#793e32", features: ["frames", "fireEscapes", "chimneys", "steps"] },
    { x: 12, z: -17, count: 5, height: 13, color: "#904a37", features: ["frames", "fireEscapes", "ac", "utilityBoxes"] },
  ],
  // spec x 18 is off-screen on a phone held upright; it goes on a side wall angled toward you on the right instead,
  // so it shows without sitting behind the backboard.
  mural: { x: 4.9, z: -11.2, w: 8, h: 7, turn: -0.72 },
  fence: { z: -5, width: 36, height: 3.5, color: "#73777a" },
  poles: [[-6.8, -11], [6.2, -22]],                        // spec x ±18: moved in to stay in view
  lights: { at: [[-5.6, -5.4], [5.6, -5.4]], color: "#ffc27b", intensity: 1.8 },   // spec x ±16
  ambient: { color: "#d18d85", intensity: 1.0 },
  sun: { color: "#ffae78", intensity: 1.3, from: [-0.7, 0.28, 0.66] },   // low sun behind your left shoulder: lights the brick, long shadows
};

const BASELINE_Z = -1.22, FT_Z = 4.57;
const HOUSE_W = 4.8, HOUSE_D = 10, FLOOR = 3.6;

// ---------- textures ----------

function groundTexture() {
  const [W, D] = SPEC.ground.size, S = 1024;
  return canvasTexture(S, S, (g) => {
    const r = rng(11);
    g.fillStyle = SPEC.ground.color; g.fillRect(0, 0, S, S);
    noise(g, S, S, 40000, r, 0.14);
    // concrete patches: lighter, squared-off repairs
    for (let i = 0; i < 14; i++) {
      const w = 30 + r() * 90, h = 20 + r() * 70;
      g.fillStyle = `rgba(150,140,128,${0.18 + r() * 0.15})`;
      g.fillRect(r() * S, r() * S, w, h);
    }
    // darker asphalt patches
    for (let i = 0; i < 12; i++) {
      g.fillStyle = `rgba(30,26,26,${0.25 + r() * 0.2})`;
      g.beginPath(); g.ellipse(r() * S, r() * S, 20 + r() * 60, 12 + r() * 40, r() * 3, 0, 7); g.fill();
    }
    // cracks
    g.strokeStyle = "rgba(20,16,16,0.7)"; g.lineWidth = 1.2;
    for (let i = 0; i < 70; i++) {
      let x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 7; j++) { x += (r() - .5) * 40; y += (r() - .5) * 40; g.lineTo(x, y); }
      g.stroke();
    }
  });
}

// Court paint only (transparent elsewhere) so the asphalt shows through: faded and patchy.
function courtLinesTexture() {
  const S = 1024, k = S / 18;
  const X = x => (x + 9) * k, Z = z => (z + 3) * k;
  return canvasTexture(S, S, (g) => {
    const r = rng(5);
    g.clearRect(0, 0, S, S);
    g.globalAlpha = 0.5;
    g.fillStyle = "#4f74b0";                                  // faded lane paint
    g.fillRect(X(-2.44), Z(BASELINE_Z), 4.88 * k, (FT_Z - BASELINE_Z) * k);
    g.globalAlpha = 0.7;
    g.strokeStyle = "#ece6da"; g.lineWidth = 0.05 * k;
    g.strokeRect(X(-2.44), Z(BASELINE_Z), 4.88 * k, (FT_Z - BASELINE_Z) * k);
    g.beginPath(); g.arc(X(0), Z(FT_Z), 1.83 * k, 0, Math.PI); g.stroke();
    g.setLineDash([0.4 * k, 0.35 * k]);
    g.beginPath(); g.arc(X(0), Z(FT_Z), 1.83 * k, Math.PI, 2 * Math.PI); g.stroke();
    g.setLineDash([]);
    g.beginPath(); g.moveTo(X(-7.62), Z(BASELINE_Z)); g.lineTo(X(7.62), Z(BASELINE_Z)); g.stroke();
    const a = Math.acos(6.7 / 7.24);
    g.beginPath(); g.moveTo(X(-6.7), Z(BASELINE_Z)); g.lineTo(X(-6.7), Z(HOOP.rimZ + 7.24 * Math.sin(a)));
    g.arc(X(0), Z(HOOP.rimZ), 7.24 * k, Math.PI - a, a, true);
    g.lineTo(X(6.7), Z(BASELINE_Z)); g.stroke();
    // wear: scrape paint away in blotches
    g.globalAlpha = 1; g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 160; i++) {
      g.fillStyle = `rgba(0,0,0,${0.2 + r() * 0.6})`;
      g.beginPath(); g.ellipse(r() * S, r() * S, 4 + r() * 30, 3 + r() * 16, r() * 3, 0, 7); g.fill();
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(r() * S, r() * S, 2, 2); }
    g.globalCompositeOperation = "source-over";
  });
}

// Window and door layout in metres from the house's bottom-left corner; the textures and the
// 3D details (fire escapes, AC units, steps) use the same layout so they line up.
function layout(h) {
  const floors = Math.floor((h - 1.2) / FLOOR);
  const wins = [];
  for (let f = 0; f < floors; f++) {
    for (const cx of [0.9, 2.4, 3.9]) {
      if (f === 0 && cx === 0.9) continue;                     // door
      wins.push({ f, cx, y: f * FLOOR + 1.0, w: 1.0, h: 1.75 });
    }
  }
  return { floors, wins, door: { cx: 0.9, w: 1.05, h: 2.45 } };
}

function facadeTexture(color, h, r, sky) {
  const k = 54, W = Math.round(HOUSE_W * k), H = Math.round(h * k);
  const L = layout(h);
  const Y = y => H - y * k;
  return canvasTexture(W, H, (g) => {
    brick(g, 0, 0, W, H, color, r, k);
    noise(g, W, H, 3000, r, 0.12);
    // cornice
    g.fillStyle = "#2a2220"; g.fillRect(0, 0, W, 0.55 * k);
    g.fillStyle = "#cfc8bd"; g.fillRect(0, 0.55 * k, W, 0.07 * k);
    for (const w of L.wins) {
      const x = (w.cx - w.w / 2) * k, y = Y(w.y + w.h);
      g.fillStyle = "#e9e5dc"; g.fillRect(x - 0.08 * k, y - 0.1 * k, (w.w + 0.16) * k, (w.h + 0.2) * k);   // white frame
      // glass: dusk sky reflected, or a warm lamp inside
      const lit = r() < 0.28;
      const gr = g.createLinearGradient(0, y, 0, y + w.h * k);
      if (lit) { gr.addColorStop(0, "#ffcf8a"); gr.addColorStop(1, "#d98a4c"); }
      else { gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); }
      g.fillStyle = gr; g.fillRect(x, y, w.w * k, w.h * k);
      g.fillStyle = "#e9e5dc";
      g.fillRect(x, y + w.h * k * 0.48, w.w * k, 0.06 * k);                  // sash
      g.fillStyle = "#bfb8ad"; g.fillRect(x - 0.12 * k, y + w.h * k, (w.w + 0.24) * k, 0.1 * k);   // sill
    }
    const d = L.door, dx = (d.cx - d.w / 2) * k, dy = Y(0.45 + d.h);
    g.fillStyle = "#e9e5dc"; g.fillRect(dx - 0.1 * k, dy - 0.45 * k, (d.w + 0.2) * k, (d.h + 0.45) * k);
    g.fillStyle = "#ffcc85"; g.fillRect(dx + 0.05 * k, dy - 0.38 * k, (d.w - 0.1) * k, 0.3 * k);     // transom
    g.fillStyle = ["#2b3a4f", "#3b2420", "#1f2b22"][Math.floor(r() * 3)];
    g.fillRect(dx, dy, d.w * k, d.h * k);
  });
}

// An original mural: the Liberty Bell in graffiti style over sprayed colour.
function muralTexture() {
  const W = 800, H = 700;
  return canvasTexture(W, H, (g) => {
    const r = rng(23);
    brick(g, 0, 0, W, H, "#8a4a38", r, 100);
    // sprayed backdrop
    const bg = g.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "rgba(46,90,170,0.92)"); bg.addColorStop(0.55, "rgba(120,60,150,0.9)"); bg.addColorStop(1, "rgba(235,90,70,0.9)");
    g.fillStyle = bg; g.beginPath(); g.roundRect(30, 30, W - 60, H - 60, 40); g.fill();
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.12})`; g.beginPath(); g.arc(r() * W, r() * H, r() * 3, 0, 7); g.fill(); }
    // sunburst behind the bell
    g.save(); g.translate(290, 320);
    for (let i = 0; i < 18; i++) { g.rotate(Math.PI / 9); g.fillStyle = i % 2 ? "rgba(255,210,110,0.35)" : "rgba(255,240,200,0.18)"; g.beginPath(); g.moveTo(0, 0); g.lineTo(-30, -330); g.lineTo(30, -330); g.fill(); }
    g.restore();
    // yoke
    g.fillStyle = "#3b2a1c"; g.fillRect(150, 112, 280, 36);
    g.fillStyle = "#2a1d12"; g.fillRect(270, 146, 40, 26);
    // bell body
    const bell = new Path2D();
    bell.moveTo(240, 170);
    bell.bezierCurveTo(205, 175, 200, 250, 195, 330);
    bell.bezierCurveTo(190, 400, 160, 440, 130, 470);
    bell.lineTo(450, 470);
    bell.bezierCurveTo(420, 440, 390, 400, 385, 330);
    bell.bezierCurveTo(380, 250, 375, 175, 340, 170);
    bell.closePath();
    const bronze = g.createLinearGradient(130, 0, 450, 0);
    bronze.addColorStop(0, "#6b4320"); bronze.addColorStop(0.35, "#d5a66d"); bronze.addColorStop(0.6, "#b98243"); bronze.addColorStop(1, "#5a3618");
    g.fillStyle = bronze; g.fill(bell);
    g.lineWidth = 10; g.strokeStyle = "#1a1210"; g.stroke(bell);
    g.fillStyle = "#8a5a2c"; g.fillRect(140, 448, 300, 22);           // lip band
    g.fillStyle = "rgba(40,24,12,0.5)"; g.fillRect(205, 228, 172, 14);  // inscription band
    // the crack
    g.strokeStyle = "#1a1210"; g.lineWidth = 7; g.lineJoin = "round";
    g.beginPath(); g.moveTo(268, 470); g.lineTo(276, 430); g.lineTo(266, 400); g.lineTo(280, 362); g.lineTo(272, 330); g.lineTo(284, 300); g.stroke();
    // drips under the bell
    g.fillStyle = "rgba(213,166,109,0.9)";
    for (const x of [170, 230, 330, 410]) { const l = 20 + r() * 50; g.fillRect(x, 470, 6, l); g.beginPath(); g.arc(x + 3, 470 + l, 5, 0, 7); g.fill(); }
    // lettering
    g.save(); g.translate(560, 300); g.rotate(-0.12);
    g.font = "900 108px 'Arial Black', Impact, sans-serif"; g.textAlign = "center";
    g.lineWidth = 16; g.strokeStyle = "#141018";
    for (const [t, y, c] of [["SOUTH", -40, "#ffd166"], ["PHILLY", 80, "#ffffff"]]) {
      g.strokeText(t, 0, y); g.fillStyle = c; g.fillText(t, 0, y);
    }
    g.restore();
    // stars
    g.fillStyle = "#fff4d6";
    for (const [x, y, s] of [[110, 120, 18], [480, 90, 14], [700, 560, 16], [90, 560, 12]]) {
      g.beginPath();
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? s * 0.45 : s; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.fill();
    }
  });
}

function skyTexture() {
  return canvasTexture(16, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#2b2346");
    gr.addColorStop(0.35, SPEC.background);
    gr.addColorStop(0.62, "#8a5a6e");
    gr.addColorStop(0.8, "#d98466");
    gr.addColorStop(1, SPEC.fog.color);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

function fenceTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "rgba(190,194,198,0.9)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
  }, { repeat: [SPEC.fence.width / 0.6, SPEC.fence.height / 0.6] });
}

// ---------- building blocks ----------

function rowhouses(group, spec, r, parts) {
  const sky = ["#7a5a86", "#2e2a40"];
  const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(spec.color).multiplyScalar(0.55), roughness: 1 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x2a2424, roughness: 1 });
  const x0 = spec.x - (spec.count * HOUSE_W) / 2;
  for (let i = 0; i < spec.count; i++) {
    const h = spec.height + (r() - 0.5) * 1.2;
    const front = new THREE.MeshStandardMaterial({ map: facadeTexture(spec.color, h, r, sky), roughness: 0.92 });
    const house = new THREE.Mesh(new THREE.BoxGeometry(HOUSE_W, h, HOUSE_D), [side, side, roof, roof, front, side]);
    const left = x0 + i * HOUSE_W, fz = spec.z;            // facade plane at z = spec.z
    house.position.set(left + HOUSE_W / 2, h / 2, fz - HOUSE_D / 2);
    house.castShadow = true; house.receiveShadow = true;
    group.add(house);
    const L = layout(h);
    const f = spec.features;
    if (f.includes("chimneys")) {
      for (let c = 0; c < 1 + (r() < 0.5); c++) parts.chimney.add(left + 0.6 + r() * 3.6, h + 0.6, fz - 1 - r() * 6);
    }
    if (f.includes("steps")) {                                  // white marble stoop under each door
      const dx = left + L.door.cx;
      for (let s = 0; s < 3; s++) parts.step.add(dx, 0.075 + s * 0.15, fz + 0.75 - s * 0.25, 0, 0, 0, 1, 1, 1 + (2 - s) * 0.0);
    }
    if (f.includes("fireEscapes") && r() < 0.7) {               // black iron landings on the upper floors
      for (let fl = 1; fl < L.floors; fl++) {
        const y = fl * FLOOR + 0.95, cx = left + 1.65;
        parts.landing.add(cx, y, fz + 0.5);
        parts.rail.add(cx, y + 1.0, fz + 0.95);                 // top rail
        parts.rail.add(cx, y + 0.5, fz + 0.95);                 // mid rail
        for (const px of [-1.15, -0.4, 0.4, 1.15]) parts.post.add(cx + px, y + 0.5, fz + 0.95);
        if (fl < L.floors - 1) parts.stair.add(cx + 0.2, y + FLOOR / 2, fz + 0.5, 0, 0, Math.atan2(FLOOR, 1.9));
      }
      const top = (L.floors - 1) * FLOOR + 0.95;
      parts.ladderRail.add(left + 2.85, (FLOOR + 0.95 + top) / 2 - FLOOR / 2 + 0.3, fz + 0.95, 0, 0, 0, 1, 1, 1);
    }
    if (f.includes("ac")) {                                     // window air conditioners
      for (const w of L.wins) if (w.f > 0 && w.cx > 3 && r() < 0.5) parts.ac.add(left + w.cx, w.y + 0.2, fz + 0.22);
    }
    if (f.includes("utilityBoxes") && r() < 0.6) parts.utility.add(left + 3.3, 0.7, fz + 0.2);
  }
}

function utilityPole(x, z) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 1 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 11, 10), wood);
  pole.position.y = 5.5; pole.castShadow = true; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.12, 0.12), wood);
  arm.position.y = 10.2; arm.castShadow = true; g.add(arm);
  const metal = new THREE.MeshStandardMaterial({ color: 0x6d7276, roughness: 0.6, metalness: 0.4 });
  const tf = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.9, 12), metal);   // transformer can
  tf.position.set(0.32, 8.8, 0); tf.castShadow = true; g.add(tf);
  // street sign
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.24), new THREE.MeshStandardMaterial({
    map: canvasTexture(256, 56, (c, w, h) => { c.fillStyle = "#1e5c3a"; c.fillRect(0, 0, w, h); c.fillStyle = "#fff"; c.font = "bold 34px Arial"; c.textAlign = "center"; c.fillText("S 9TH ST", w / 2, 40); }),
    side: THREE.DoubleSide,
  }));
  sign.position.set(0, 2.9, 0.19); g.add(sign);
  g.position.set(x, 0, z);
  return g;
}

function streetLight(x, z, flip) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.6, metalness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 7, 10), metal);
  pole.position.y = 3.5; pole.castShadow = true; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), metal);
  arm.position.set(0.55, 6.9, 0); g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: SPEC.lights.color, emissiveIntensity: 2.4 }));
  head.position.set(1.05, 6.8, 0); g.add(head);
  g.position.set(x, 0, z);
  if (flip) g.rotation.y = Math.PI;
  return g;
}

export function build() {
  const group = new THREE.Group();
  const r = rng(42);

  // Ground and court paint.
  const [GW, GD] = SPEC.ground.size;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GW, GD, Math.ceil(GW / 2), Math.ceil(GD / 2)), new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.9 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, SPEC.ground.z); ground.receiveShadow = true;
  group.add(ground);
  const lines = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.MeshStandardMaterial({ map: courtLinesTexture(), transparent: true, roughness: 0.85, depthWrite: false, ...DECAL }));
  lines.rotation.x = -Math.PI / 2; lines.position.set(0, 0.004, 6); lines.receiveShadow = true;
  group.add(lines);

  // Small repeated parts, one instanced mesh each.
  const iron = new THREE.MeshStandardMaterial({ color: 0x1b1b1e, roughness: 0.7, metalness: 0.5 });
  const parts = {
    chimney: instancer(new THREE.BoxGeometry(0.6, 1.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x5e3428, roughness: 1 })),
    step: instancer(new THREE.BoxGeometry(1.3, 0.15, 0.3), new THREE.MeshStandardMaterial({ color: 0xd8d4cc, roughness: 0.5 })),
    landing: instancer(new THREE.BoxGeometry(2.5, 0.06, 0.9), iron),
    rail: instancer(new THREE.BoxGeometry(2.5, 0.04, 0.04), iron),
    post: instancer(new THREE.BoxGeometry(0.04, 1.0, 0.04), iron),
    stair: instancer(new THREE.BoxGeometry(4.1, 0.05, 0.55), iron),
    ladderRail: instancer(new THREE.BoxGeometry(0.05, FLOOR * 1.6, 0.05), iron),
    ac: instancer(new THREE.BoxGeometry(0.66, 0.42, 0.5), new THREE.MeshStandardMaterial({ color: 0xbdbab2, roughness: 0.6 })),
    utility: instancer(new THREE.BoxGeometry(0.8, 1.3, 0.4), new THREE.MeshStandardMaterial({ color: 0x7b8086, roughness: 0.7, metalness: 0.3 })),
  };
  for (const spec of SPEC.rowhouses) rowhouses(group, spec, r, parts);
  for (const p of Object.values(parts)) group.add(p.build());

  // Mural on a free-standing brick wall in front of the right-hand rowhouses.
  const m = SPEC.mural;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(m.w + 0.3, m.h + 0.6, 0.5), [
    new THREE.MeshStandardMaterial({ color: 0x7a3e30, roughness: 1 }), new THREE.MeshStandardMaterial({ color: 0x7a3e30, roughness: 1 }),
    new THREE.MeshStandardMaterial({ color: 0x3a2a26, roughness: 1 }), new THREE.MeshStandardMaterial({ color: 0x3a2a26, roughness: 1 }),
    new THREE.MeshStandardMaterial({ map: muralTexture(), roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: 0x7a3e30, roughness: 1 }),
  ]);
  wall.position.set(m.x, (m.h + 0.6) / 2, m.z); wall.rotation.y = m.turn; wall.castShadow = true; wall.receiveShadow = true;
  group.add(wall);

  // Chain-link fence behind the hoop.
  const F = SPEC.fence;
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(F.width, F.height),
    new THREE.MeshStandardMaterial({ map: fenceTexture(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5, color: 0xffffff }));
  fence.position.set(0, F.height / 2, F.z); fence.castShadow = true;
  group.add(fence);
  const postMat = new THREE.MeshStandardMaterial({ color: F.color, roughness: 0.5, metalness: 0.6 });
  const posts = instancer(new THREE.CylinderGeometry(0.045, 0.045, F.height, 8), postMat);
  for (let x = -F.width / 2; x <= F.width / 2; x += 3) posts.add(x, F.height / 2, F.z);
  group.add(posts.build());
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, F.width, 8), postMat);
  rail.rotation.z = Math.PI / 2; rail.position.set(0, F.height, F.z); group.add(rail);

  // Utility poles and power lines.
  const wireMat = new THREE.LineBasicMaterial({ color: 0x1a1414 });
  const tops = [];
  for (const [x, z] of SPEC.poles) { group.add(utilityPole(x, z)); tops.push(new THREE.Vector3(x, 10.25, z)); }
  for (const dx of [-1.0, 0, 1.0]) {
    const a = tops[0].clone().add(new THREE.Vector3(dx, 0, 0)), b = tops[1].clone().add(new THREE.Vector3(dx, 0, 0));
    group.add(wire(a, b, 0.9, wireMat));
    group.add(wire(a, a.clone().add(new THREE.Vector3(-14, -0.4, 6)), 0.7, wireMat));     // runs off to the left
    group.add(wire(b, b.clone().add(new THREE.Vector3(16, 0.3, -2)), 0.8, wireMat));      // and off to the right
  }
  group.add(wire(tops[0].clone().add(new THREE.Vector3(0, -1.4, 0)), new THREE.Vector3(-3, 8.4, -17), 0.5, wireMat));  // drop to a house

  // Street lights: two warm lamps (with the sun, that's the three dynamic lights the spec allows).
  SPEC.lights.at.forEach(([x, z], i) => {
    group.add(streetLight(x, z, i === 1));
    const lamp = new THREE.PointLight(SPEC.lights.color, SPEC.lights.intensity * 3, 14, 1.4);
    lamp.position.set(x + (i === 1 ? -1.05 : 1.05), 6.6, z);
    group.add(lamp);
  });

  // Sunset light: warm ambient plus a low sun that casts long shadows (baked once at start).
  group.add(new THREE.AmbientLight(SPEC.ambient.color, SPEC.ambient.intensity));
  const sun = new THREE.DirectionalLight(SPEC.sun.color, SPEC.sun.intensity * 2.7);
  const from = new THREE.Vector3(...SPEC.sun.from).normalize();
  sun.target.position.set(0, 0, -6);
  sun.position.copy(sun.target.position).addScaledVector(from, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 10, far: 130 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
  group.add(sun, sun.target);
  const fill = new THREE.HemisphereLight(0xffd2b8, 0x4a3438, 0.7);    // soft bounce so faces in shadow aren't black
  group.add(fill);
  courtFloods(group, { color: 0xffe2c4, intensity: 1.3 });   // court lights coming on at dusk

  return {
    group,
    background: skyTexture(),
    fog: new THREE.Fog(SPEC.fog.color, SPEC.fog.near, SPEC.fog.far),
    shooterTint: 0xfff0e4,      // warm the pre-rendered shooter to match the sunset
    exposure: 1.6,
    shadows: true,
  };
}
