// South Philly neighbourhood court at night.
// A court module returns { group, background, fog } and knows nothing about
// the ball, hoop, shooter or UI, so courts can be swapped freely.
import * as THREE from "../../vendor/three.module.min.js";
import { canvasTexture, rng, noise } from "../util.js";
import { HOOP } from "../physics.js";

export const name = "South Philly";

const BASELINE_Z = -1.22;          // the board hangs 4 ft in from the baseline
const PAINT = "#17346e";            // lane paint
const LINE = "rgba(236,240,246,0.86)";

function courtTexture() {
  // Plane covers x -9..9, z -3..15 (18 m square). Canvas top = far end (z = -3).
  const S = 1024, k = S / 18;
  const X = x => (x + 9) * k, Z = z => (z + 3) * k;
  return canvasTexture(S, S, (g) => {
    const r = rng(7);
    g.fillStyle = "#24272e"; g.fillRect(0, 0, S, S);
    noise(g, S, S, 26000, r, 0.12);
    // Patched asphalt.
    for (let i = 0; i < 9; i++) {
      g.fillStyle = `rgba(${r() < .5 ? 10 : 50},${r() < .5 ? 12 : 52},${r() < .5 ? 16 : 58},0.25)`;
      g.fillRect(r() * S, r() * S, 60 + r() * 160, 40 + r() * 120);
    }
    // Court surface (slightly darker coat) inside the sidelines.
    g.fillStyle = "rgba(20,30,52,0.55)";
    g.fillRect(X(-7.62), Z(BASELINE_Z), 15.24 * k, (15 - BASELINE_Z) * k);
    // Lane.
    g.fillStyle = PAINT;
    g.fillRect(X(-2.44), Z(BASELINE_Z), 4.88 * k, (FT_Z() - BASELINE_Z) * k);
    g.strokeStyle = LINE; g.lineWidth = 0.05 * k;
    g.strokeRect(X(-2.44), Z(BASELINE_Z), 4.88 * k, (FT_Z() - BASELINE_Z) * k);
    // Free-throw circle: top half solid, bottom half dashed.
    g.beginPath(); g.arc(X(0), Z(FT_Z()), 1.83 * k, 0, Math.PI); g.stroke();
    g.setLineDash([0.4 * k, 0.35 * k]);
    g.beginPath(); g.arc(X(0), Z(FT_Z()), 1.83 * k, Math.PI, 2 * Math.PI); g.stroke();
    g.setLineDash([]);
    // Baseline, sidelines, three-point line, half court.
    g.beginPath(); g.moveTo(X(-7.62), Z(BASELINE_Z)); g.lineTo(X(7.62), Z(BASELINE_Z)); g.stroke();
    g.beginPath(); g.moveTo(X(-7.62), Z(BASELINE_Z)); g.lineTo(X(-7.62), Z(15)); g.stroke();
    g.beginPath(); g.moveTo(X(7.62), Z(BASELINE_Z)); g.lineTo(X(7.62), Z(15)); g.stroke();
    const a = Math.acos(6.7 / 7.24);
    g.beginPath(); g.moveTo(X(-6.7), Z(BASELINE_Z)); g.lineTo(X(-6.7), Z(HOOP.rimZ + 7.24 * Math.sin(a)));
    g.arc(X(0), Z(HOOP.rimZ), 7.24 * k, Math.PI - a, a, true);
    g.lineTo(X(6.7), Z(BASELINE_Z)); g.stroke();
    // Wear: cracks and scuffs over the paint.
    g.strokeStyle = "rgba(10,10,12,0.55)"; g.lineWidth = 1.5;
    for (let i = 0; i < 26; i++) {
      let x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 6; j++) { x += (r() - .5) * 60; y += (r() - .5) * 60; g.lineTo(x, y); }
      g.stroke();
    }
    noise(g, S, S, 9000, r, 0.1);
  });
}
const FT_Z = () => 4.57;

function fenceTexture() {
  return canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "rgba(170,180,195,0.85)"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
  }, { repeat: [60, 10] });
}

function rowhouseTextures(r, lit) {
  const W = 256, H = 512;
  const brick = ["#4a2a24", "#3e2622", "#55302a", "#3a2a2a", "#4d3226"][Math.floor(r() * 5)];
  const windows = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 2; col++) {
    if (row === 0 && col === 0) continue;  // door goes here
    windows.push({ x: 40 + col * 110, y: 70 + row * 140, on: r() < lit, warm: r() < 0.75 });
  }
  const map = canvasTexture(W, H, (g) => {
    g.fillStyle = brick; g.fillRect(0, 0, W, H);
    g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 1;
    for (let y = 0; y < H; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    noise(g, W, H, 3000, r, 0.15);
    g.fillStyle = "#1a1412"; g.fillRect(0, 0, W, 28);                 // cornice
    g.fillStyle = "#2c2420"; g.fillRect(150, 350, 70, 162);             // door
    g.fillStyle = "#6b6460"; g.fillRect(140, 500, 90, 12);              // marble step
    for (const w of windows) {
      g.fillStyle = "#cfc6bc"; g.fillRect(w.x - 6, w.y - 6, 82, 112);   // frame
      g.fillStyle = w.on ? (w.warm ? "#ffc979" : "#bfd7ff") : "#0d1220";
      g.fillRect(w.x, w.y, 70, 100);
      g.fillStyle = "rgba(0,0,0,0.35)"; g.fillRect(w.x + 33, w.y, 4, 100); g.fillRect(w.x, w.y + 48, 70, 4);
    }
  });
  const glow = canvasTexture(W, H, (g) => {
    g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
    for (const w of windows) if (w.on) { g.fillStyle = w.warm ? "#ffb35c" : "#9fc2ff"; g.fillRect(w.x, w.y, 70, 100); }
    g.fillStyle = "#3a2a14"; g.fillRect(160, 360, 50, 20);              // transom light
  });
  return { map, glow };
}

function skylineTexture(r, w, h) {
  return canvasTexture(128, 512, (g, W, H) => {
    g.fillStyle = "#0b1020"; g.fillRect(0, 0, W, H);
    for (let y = 8; y < H; y += 10) for (let x = 6; x < W - 6; x += 10) {
      if (r() < 0.34) { g.fillStyle = r() < 0.8 ? "rgba(255,214,150,0.9)" : "rgba(170,205,255,0.9)"; g.fillRect(x, y, 5, 5); }
    }
  });
}

function skyTexture() {
  return canvasTexture(16, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "#03060f");
    gr.addColorStop(0.55, "#0a1430");
    gr.addColorStop(0.8, "#24203c");
    gr.addColorStop(1, "#3a2b33");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

function lampPost(x, z, h) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.6, metalness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, h, 10), metal);
  pole.position.y = h / 2; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.07), metal);
  arm.position.set(0.5, h - 0.1, 0); g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.28),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffd9a0, emissiveIntensity: 2.2 }));
  head.position.set(1.0, h - 0.18, 0); g.add(head);
  g.position.set(x, 0, z);
  return g;
}

export function build() {
  const group = new THREE.Group();
  const r = rng(42);

  // Ground: wide dark street, then the court on top.
  const street = new THREE.Mesh(new THREE.PlaneGeometry(120, 120),
    new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 1 }));
  street.rotation.x = -Math.PI / 2; street.position.set(0, -0.01, 0);
  group.add(street);
  const court = new THREE.Mesh(new THREE.PlaneGeometry(18, 18),
    new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.92 }));
  court.rotation.x = -Math.PI / 2; court.position.set(0, 0, 6);
  group.add(court);

  // Chain-link fence behind the hoop.
  const fenceMat = new THREE.MeshStandardMaterial({ map: fenceTexture(), transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.6 });
  const fence = new THREE.Mesh(new THREE.PlaneGeometry(40, 4.5), fenceMat);
  fence.position.set(0, 2.25, -4.6); group.add(fence);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x5b636e, roughness: 0.5, metalness: 0.7 });
  for (let x = -18; x <= 18; x += 3) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.6, 8), postMat);
    p.position.set(x, 2.3, -4.6); group.add(p);
  }
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 40, 8), postMat);
  rail.rotation.z = Math.PI / 2; rail.position.set(0, 4.5, -4.6); group.add(rail);

  // A block of rowhouses across the street.
  for (let i = -6; i <= 6; i++) {
    const w = 6, h = 12 + r() * 2.5, d = 10;
    const { map, glow } = rowhouseTextures(r, 0.45);
    const front = new THREE.MeshStandardMaterial({ map, emissiveMap: glow, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.9 });
    const side = new THREE.MeshStandardMaterial({ color: 0x20160f, roughness: 1 });
    const house = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, side, side, front, side]);
    house.position.set(i * w, h / 2, -40 - d / 2 + (r() - 0.5) * 0.2);
    group.add(house);
  }

  // Center City skyline far off.
  const towers = [
    [-70, 150, 26], [-40, 210, 22], [-18, 290, 28], [8, 260, 24], [30, 190, 30], [55, 230, 22], [90, 160, 30], [-100, 120, 34], [120, 140, 28],
  ];
  for (const [x, h0, w] of towers) {
    const h = h0 * 0.5;
    const m = new THREE.MeshBasicMaterial({ map: skylineTexture(r, w, h), fog: false });
    const t = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    t.position.set(x, h / 2 - 4, -420); group.add(t);
  }
  // Two spire-topped towers.
  for (const [x, h, w] of [[-18, 145, 28], [8, 130, 24]]) {
    const spire = new THREE.Mesh(new THREE.ConeGeometry(w * 0.45, 46, 4),
      new THREE.MeshBasicMaterial({ color: 0x1a2440, fog: false }));
    spire.position.set(x, h - 4 + 23, -421); spire.rotation.y = Math.PI / 4; group.add(spire);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4040, fog: false }));
    tip.position.set(x, h - 4 + 47, -421); group.add(tip);
  }

  // Street lights.
  group.add(lampPost(-6.5, -5.2, 7.5));
  const right = lampPost(6.5, -5.2, 7.5); right.rotation.y = Math.PI; group.add(right);

  // Lighting: cool night fill plus warm court lights.
  group.add(new THREE.HemisphereLight(0x5466a0, 0x1a120c, 0.55));
  for (const x of [-5.5, 5.5]) {
    const s = new THREE.SpotLight(0xffe2b8, 3.2, 0, Math.PI / 4.2, 0.55, 0);
    s.position.set(x, 7.2, -4.2);
    s.target.position.set(0, 0, 3.2);
    group.add(s, s.target);
  }
  const fill = new THREE.DirectionalLight(0x9fb4ff, 0.6);
  fill.position.set(-3, 5, 12); group.add(fill);
  const key = new THREE.DirectionalLight(0xffdcb8, 0.9);   // lights the shooter's back
  key.position.set(3, 7, 14); group.add(key);

  return {
    group,
    background: skyTexture(),
    fog: new THREE.Fog(0x0d1226, 22, 90),
  };
}
