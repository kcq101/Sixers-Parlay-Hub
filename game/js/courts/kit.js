// Shared building blocks for courts. Every court uses the same scale (metres), the same
// coordinates (hoop glass at z = 0, shooter near z = 4.7, camera behind him at z ≈ 11)
// and these same parts, so the three courts stay consistent.
import * as THREE from "../../vendor/three.module.min.js";
import { canvasTexture, rng, noise } from "../util.js";
import { HOOP } from "../physics.js";

export { THREE, canvasTexture, rng, noise };
export const BASELINE_Z = -1.22, FT_Z = 4.57;

// ---------- instancing ----------

// Collects many copies of one part and turns them into a single instanced mesh (one draw call).
export function instancer(geo, mat, { shadows = true } = {}) {
  const list = [];
  const q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), e = new THREE.Euler();
  return {
    add(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      q.setFromEuler(e.set(rx, ry, rz)); s.set(sx, sy, sz);
      list.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, s));
    },
    addMatrix(m) { list.push(m.clone()); },
    get count() { return list.length; },
    build() {
      const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
      list.forEach((mm, i) => mesh.setMatrixAt(i, mm));
      mesh.count = list.length;
      mesh.castShadow = shadows; mesh.receiveShadow = shadows;
      return mesh;
    },
  };
}

// A beam between two points, added to an instancer built on a 1×1×1 box.
const _Y = new THREE.Vector3(0, 1, 0), _d = new THREE.Vector3(), _mid = new THREE.Vector3(), _q = new THREE.Quaternion();
export function beam(inst, a, b, w, d = w) {
  _d.subVectors(b, a);
  const len = _d.length();
  _mid.addVectors(a, b).multiplyScalar(0.5);
  _q.setFromUnitVectors(_Y, _d.normalize());
  inst.addMatrix(new THREE.Matrix4().compose(_mid, _q, new THREE.Vector3(w, len, d)));
}
export const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- lines and wires ----------

// A sagging wire or cable between two points.
export function wirePoints(a, b, sag, n = 20) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push(new THREE.Vector3().lerpVectors(a, b, t).add(new THREE.Vector3(0, -sag * 4 * t * (1 - t), 0)));
  }
  return pts;
}
export function wire(a, b, sag, mat) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(wirePoints(a, b, sag)), mat);
}

// Small glowing dots (string lights, windows far away). One draw call for all of them.
export function glowPoints(points, color, size = 3) {
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const tex = canvasTexture(32, 32, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.6)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  return new THREE.Points(geo, new THREE.PointsMaterial({
    color, size, sizeAttenuation: false, map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  }));
}

// ---------- textures ----------

export function brick(g, x0, y0, w, h, base, r, k) {
  const c = new THREE.Color(base);
  const bw = 0.23 * k, bh = 0.075 * k;
  g.fillStyle = "#4a3a34"; g.fillRect(x0, y0, w, h);       // mortar
  for (let row = 0, y = y0; y < y0 + h; y += bh, row++) {
    for (let x = x0 - (row % 2) * bw / 2; x < x0 + w; x += bw) {
      const v = 0.85 + r() * 0.3;
      g.fillStyle = `rgb(${c.r * 255 * v | 0},${c.g * 255 * v | 0},${c.b * 255 * v | 0})`;
      g.fillRect(x + 1, y + 1, bw - 2, bh - 2);
    }
  }
}

export function skyGradient(stops) {
  return canvasTexture(16, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    for (const [t, c] of stops) gr.addColorStop(t, c);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
}

// Worn pavement: base colour, light concrete repairs, dark patches, cracks.
export function pavementTexture({ color, seed = 11, patches = 14, darks = 12, cracks = 70 }) {
  const S = 1024;
  return canvasTexture(S, S, (g) => {
    const r = rng(seed);
    g.fillStyle = color; g.fillRect(0, 0, S, S);
    noise(g, S, S, 40000, r, 0.14);
    for (let i = 0; i < patches; i++) {
      g.fillStyle = `rgba(150,140,128,${0.18 + r() * 0.15})`;
      g.fillRect(r() * S, r() * S, 30 + r() * 90, 20 + r() * 70);
    }
    for (let i = 0; i < darks; i++) {
      g.fillStyle = `rgba(30,26,26,${0.25 + r() * 0.2})`;
      g.beginPath(); g.ellipse(r() * S, r() * S, 20 + r() * 60, 12 + r() * 40, r() * 3, 0, 7); g.fill();
    }
    g.strokeStyle = "rgba(20,16,16,0.7)"; g.lineWidth = 1.2;
    for (let i = 0; i < cracks; i++) {
      let x = r() * S, y = r() * S; g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 7; j++) { x += (r() - .5) * 40; y += (r() - .5) * 40; g.lineTo(x, y); }
      g.stroke();
    }
  });
}

// Court paint only (transparent elsewhere) so the ground shows through; faded and patchy.
// Covers x -9..9, z -3..15. Canvas top = far end.
export function courtLinesTexture({ paint = "#4f74b0", paintAlpha = 0.5, line = "#ece6da", lineAlpha = 0.7, wear = 160, seed = 5, surface = null } = {}) {
  const S = 1024, k = S / 18;
  const X = x => (x + 9) * k, Z = z => (z + 3) * k;
  return canvasTexture(S, S, (g) => {
    const r = rng(seed);
    g.clearRect(0, 0, S, S);
    if (surface) {                                              // optional painted court surface inside the lines
      g.globalAlpha = surface.alpha; g.fillStyle = surface.color;
      g.fillRect(X(-7.62), Z(BASELINE_Z), 15.24 * k, (15 - BASELINE_Z) * k);
    }
    g.globalAlpha = paintAlpha;
    g.fillStyle = paint;
    g.fillRect(X(-2.44), Z(BASELINE_Z), 4.88 * k, (FT_Z - BASELINE_Z) * k);
    g.globalAlpha = lineAlpha;
    g.strokeStyle = line; g.lineWidth = 0.05 * k;
    g.strokeRect(X(-2.44), Z(BASELINE_Z), 4.88 * k, (FT_Z - BASELINE_Z) * k);
    g.beginPath(); g.arc(X(0), Z(FT_Z), 1.83 * k, 0, Math.PI); g.stroke();
    g.setLineDash([0.4 * k, 0.35 * k]);
    g.beginPath(); g.arc(X(0), Z(FT_Z), 1.83 * k, Math.PI, 2 * Math.PI); g.stroke();
    g.setLineDash([]);
    g.beginPath(); g.moveTo(X(-7.62), Z(BASELINE_Z)); g.lineTo(X(7.62), Z(BASELINE_Z)); g.stroke();
    if (surface) {
      g.beginPath(); g.moveTo(X(-7.62), Z(BASELINE_Z)); g.lineTo(X(-7.62), Z(15)); g.moveTo(X(7.62), Z(BASELINE_Z)); g.lineTo(X(7.62), Z(15)); g.stroke();
    }
    const a = Math.acos(6.7 / 7.24);
    g.beginPath(); g.moveTo(X(-6.7), Z(BASELINE_Z)); g.lineTo(X(-6.7), Z(HOOP.rimZ + 7.24 * Math.sin(a)));
    g.arc(X(0), Z(HOOP.rimZ), 7.24 * k, Math.PI - a, a, true);
    g.lineTo(X(6.7), Z(BASELINE_Z)); g.stroke();
    g.globalAlpha = 1; g.globalCompositeOperation = "destination-out";
    for (let i = 0; i < wear; i++) {
      g.fillStyle = `rgba(0,0,0,${0.2 + r() * 0.6})`;
      g.beginPath(); g.ellipse(r() * S, r() * S, 4 + r() * 30, 3 + r() * 16, r() * 3, 0, 7); g.fill();
    }
    for (let i = 0; i < 9000; i++) { g.fillStyle = "rgba(0,0,0,0.5)"; g.fillRect(r() * S, r() * S, 2, 2); }
    g.globalCompositeOperation = "source-over";
  });
}

// Ground plane + court paint, in one call.
export function groundAndCourt(group, { size, z, color, lines, seed, roughness = 0.9, shadows = true }) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]),
    new THREE.MeshStandardMaterial({ map: pavementTexture({ color, seed }), roughness }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, 0, z); ground.receiveShadow = shadows;
  group.add(ground);
  const court = new THREE.Mesh(new THREE.PlaneGeometry(18, 18),
    new THREE.MeshStandardMaterial({ map: courtLinesTexture(lines), transparent: true, roughness: 0.85, depthWrite: false }));
  court.rotation.x = -Math.PI / 2; court.position.set(0, 0.004, 6); court.receiveShadow = shadows;
  group.add(court);
  return { ground, court };
}

// Lit windows on a dark tower face. lit = share of windows on.
export function towerWindows(r, { cols = 10, rows = 40, lit = 0.45, warm = 0.7, base = "#0d1424", cool = "rgba(170,205,255,0.95)", warmC = "rgba(255,214,150,0.95)", W = 128, H = 512 } = {}) {
  return canvasTexture(W, H, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, W, H);
    const cw = W / cols, rh = H / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (r() < lit) { g.fillStyle = r() < warm ? warmC : cool; g.fillRect(x * cw + cw * 0.2, y * rh + rh * 0.25, cw * 0.6, rh * 0.5); }
    }
  });
}

// ---------- props ----------

// Chain-link fence segment from (x0, z0) to (x1, z1).
export function chainLink(group, { x0, z0, x1, z1, height = 3.5, color = "#73777a", wire = "rgba(190,194,198,0.9)" }) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const tex = canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = wire; g.lineWidth = 3;
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, h); g.moveTo(w, 0); g.lineTo(0, h); g.stroke();
  }, { repeat: [len / 0.6, height / 0.6] });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(len, height),
    new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 }));
  const ang = Math.atan2(z1 - z0, x1 - x0);
  mesh.position.set((x0 + x1) / 2, height / 2, (z0 + z1) / 2); mesh.rotation.y = -ang;
  group.add(mesh);
  const postMat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.6 });
  const posts = instancer(new THREE.CylinderGeometry(0.045, 0.045, height, 8), postMat, { shadows: false });
  const n = Math.max(1, Math.round(len / 3));
  for (let i = 0; i <= n; i++) posts.add(x0 + (x1 - x0) * i / n, height / 2, z0 + (z1 - z0) * i / n);
  group.add(posts.build());
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), postMat);
  rail.position.set((x0 + x1) / 2, height, (z0 + z1) / 2); rail.rotation.set(0, -ang, Math.PI / 2);
  group.add(rail);
}

// Modern cobra-head street light. flip = arm points the other way.
export function streetLight(x, z, flip, color, height = 7) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.6, metalness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, height, 10), metal);
  pole.position.y = height / 2; pole.castShadow = true; g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.08), metal);
  arm.position.set(0.55, height - 0.1, 0); g.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: 2.4 }));
  head.position.set(1.05, height - 0.2, 0); g.add(head);
  g.position.set(x, 0, z);
  if (flip) g.rotation.y = Math.PI;
  return g;
}

// Vintage acorn lamp on an ornate black post.
export function vintageLamp(x, z, color = "#ffd29a") {
  const g = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6, metalness: 0.6 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.6, 12), iron); base.position.y = 0.3; g.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.4, 10), iron); post.position.y = 2.1; g.add(post);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.03, 6, 16), iron); ring.rotation.x = Math.PI / 2; ring.position.y = 3.8; g.add(ring);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff2dc, emissive: color, emissiveIntensity: 2.2, roughness: 0.3 }));
  globe.scale.set(1, 1.3, 1); globe.position.y = 4.15; g.add(globe);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.22, 10), iron); cap.position.y = 4.6; g.add(cap);
  g.position.set(x, 0, z);
  return g;
}

// Fake light on the ground: a soft additive glow (and an optional reflection streak toward the
// camera, for wet pavement). Much cheaper than real reflections.
export function lightPool(group, x, z, color, { radius = 4, strength = 0.5, streak = 0 } = {}) {
  const tex = canvasTexture(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  }, { srgb: false });
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(color).multiplyScalar(strength), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), mat);
  pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.012, z);
  group.add(pool);
  if (streak) {
    const st = new THREE.Mesh(new THREE.PlaneGeometry(radius * 0.35, streak), mat.clone());
    st.material.color.multiplyScalar(0.8);
    st.rotation.x = -Math.PI / 2; st.position.set(x, 0.013, z + streak / 2);
    group.add(st);
  }
}

// ---------- Philadelphia skyline ----------
// Towers inspired by the real skyline's shapes (no names or logos):
//  "lantern" tall glass tower with a glowing top box · "taper" glass tower narrowing to a peak
//  "spire" stepped gable crown with a needle · "pyramid" stepped pyramid top · "flat" plain box.
export function phillySkyline(group, towers, { r, fog = false, dim = 1 } = {}) {
  const crownMat = (c, e) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: 1.0 * dim, roughness: 0.6, fog });
  for (const t of towers) {
    const { x, z, h, w, d = w, kind = "flat", lit = 0.45, warm = 0.6 } = t;
    const tex = towerWindows(r, { cols: Math.max(6, Math.round(w / 3)), rows: Math.round(h / 4), lit, warm });
    const face = new THREE.MeshBasicMaterial({ map: tex, fog, color: new THREE.Color(dim, dim, dim) });
    const roof = new THREE.MeshBasicMaterial({ color: 0x0b1020, fog });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [face, face, roof, roof, face, face]);
    body.position.set(x, h / 2, z);
    group.add(body);
    if (kind === "lantern") {
      const top = new THREE.Mesh(new THREE.BoxGeometry(w * 0.86, h * 0.07, d * 0.86), crownMat(0xdfe8ff, 0x9fc4ff));
      top.position.set(x, h + h * 0.035, z); group.add(top);
    } else if (kind === "taper") {
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.4, w * 0.7, h * 0.12, 4), crownMat(0x8fb3e8, 0x3b6db8));
      top.rotation.y = Math.PI / 4; top.position.set(x, h + h * 0.06, z); group.add(top);
    } else if (kind === "spire") {
      for (let i = 0; i < 3; i++) {
        const s = 1 - i * 0.24, hh = h * 0.035;
        const step = new THREE.Mesh(new THREE.BoxGeometry(w * s, hh, d * s), crownMat(0xe8eef8, 0xb8c8e8));
        step.position.set(x, h + hh * (i + 0.5), z); group.add(step);
        const gable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, w * s * 0.7, hh * 1.4, 4, 1, true), crownMat(0xe8eef8, 0xb8c8e8));
        gable.rotation.y = Math.PI / 4; gable.position.set(x, h + hh * (i + 1.2), z); group.add(gable);
      }
      const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.9, h * 0.13, 6), crownMat(0xf4f6fa, 0xd8e2f4));
      needle.position.set(x, h + h * 0.105 + h * 0.065, z); group.add(needle);
    } else if (kind === "pyramid") {
      for (let i = 0; i < 4; i++) {
        const s = 1 - i * 0.22, hh = h * 0.03;
        const step = new THREE.Mesh(new THREE.BoxGeometry(w * s, hh, d * s), crownMat(0xbfd3f0, 0x6f9ce0));
        step.position.set(x, h + hh * (i + 0.5), z); group.add(step);
      }
    }
  }
}

// The default skyline layout, centred on x = cx at distance z; scale shrinks/grows it as a whole.
export function phillyTowers(cx, z, s = 1) {
  const T = (dx, dz, h, w, kind, extra = {}) => ({ x: cx + dx * s, z: z + dz * s, h: h * s, w: w * s, kind, ...extra });
  return [
    T(-170, 40, 120, 40, "flat"), T(-125, -30, 170, 36, "flat"),
    T(-80, 10, 258, 34, "spire"), T(-40, -60, 288, 38, "spire"),
    T(-5, 30, 150, 44, "flat", { lit: 0.35 }), T(30, -20, 297, 40, "taper"),
    T(70, -80, 342, 44, "lantern"), T(110, 20, 230, 38, "pyramid"),
    T(150, -10, 180, 34, "flat"), T(195, 30, 130, 42, "flat"), T(240, -40, 160, 36, "flat"),
    T(-210, -10, 90, 50, "flat"), T(285, 10, 100, 48, "flat"),
  ];
}
