// Backboard, rim, net and pole. Sizes come from physics.js so what you see is what the ball hits.
import * as THREE from "../vendor/three.module.min.js";
import { canvasTexture } from "./util.js";
import { HOOP } from "./physics.js";

const NET_STRANDS = 16, NET_ROWS = 6, NET_BOTTOM_R = 0.14;

// style.board: "glass" (default, see-through) or "solid" (painted steel street board).
// style.color / style.line: board colour and line colour for a solid board.
export function build(style = {}) {
  const g = new THREE.Group();
  const H = HOOP;
  const bw = H.boardHalfW * 2, bh = H.boardTop - H.boardBottom;
  const sq = (w, h) => ({ w: 0.61 / bw * w, h: 0.457 / bh * h, bottom: h - (H.rimY + 0.01 - H.boardBottom) / bh * h });

  if (style.board === "solid") {
    // Painted steel board: off-white/grey with weathering, bolts, and a red-orange border and box.
    const line = style.line || "#e0502a";
    const tex = canvasTexture(512, 300, (c, w, h) => {
      c.fillStyle = style.color || "#d6d8d6"; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? "60,58,54" : "255,255,255"},${Math.random() * 0.06})`; c.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 6, 2); }
      for (let i = 0; i < 14; i++) {                                         // rust and grime streaks running down
        const x = Math.random() * w, y = Math.random() * h * 0.6, len = 30 + Math.random() * 90;
        const gr = c.createLinearGradient(0, y, 0, y + len);
        gr.addColorStop(0, `rgba(${Math.random() < 0.5 ? "140,80,40" : "70,66,60"},0.22)`); gr.addColorStop(1, "rgba(0,0,0,0)");
        c.fillStyle = gr; c.fillRect(x, y, 2 + Math.random() * 4, len);
      }
      c.strokeStyle = line; c.lineWidth = 14; c.strokeRect(10, 10, w - 20, h - 20);      // border
      const s2 = sq(w, h);
      c.lineWidth = 9; c.strokeRect(w / 2 - s2.w / 2, s2.bottom - s2.h, s2.w, s2.h);       // box over the rim
      c.fillStyle = "#6d6f70";                                                            // bolts
      for (const [x, y] of [[26, 26], [w - 26, 26], [26, h - 26], [w - 26, h - 26], [w / 2, 26]]) { c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); }
    });
    const board = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, 0.04), [
      ...Array(4).fill(new THREE.MeshStandardMaterial({ color: 0x8a8d90, roughness: 0.6, metalness: 0.5 })),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0.15 }),
      new THREE.MeshStandardMaterial({ color: 0x7c8084, roughness: 0.7, metalness: 0.4 }),
    ]);
    board.position.set(0, H.boardBottom + bh / 2, H.boardZ - 0.02);
    g.add(board);
    // Steel frame bars on the back, visible around the edges.
    const frame = new THREE.MeshStandardMaterial({ color: 0x55595e, metalness: 0.7, roughness: 0.45 });
    for (const y of [H.boardBottom + 0.15, H.boardTop - 0.15]) { const b = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.9, 0.06, 0.06), frame); b.position.set(0, y, H.boardZ - 0.08); g.add(b); }
  } else {
    // Glass: faint tint, white border, shooter's square.
    const glassTex = canvasTexture(512, 300, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.fillStyle = "rgba(10,20,40,0.45)"; c.fillRect(0, 0, w, h);
      c.strokeStyle = "#f4f6fa"; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12);
      const s2 = sq(w, h);
      c.lineWidth = 8; c.strokeRect(w / 2 - s2.w / 2, s2.bottom - s2.h, s2.w, s2.h);
    });
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh),
      new THREE.MeshStandardMaterial({ map: glassTex, transparent: true, roughness: 0.15, metalness: 0.1, depthWrite: false }));
    glass.position.set(0, H.boardBottom + bh / 2, H.boardZ - 0.005);
    g.add(glass);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ae, metalness: 0.8, roughness: 0.35 });
    const edge = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.04), frameMat); m.position.set(x, y, H.boardZ - 0.03); g.add(m); };
    edge(bw + 0.04, 0.04, 0, H.boardTop); edge(bw + 0.04, 0.04, 0, H.boardBottom);
    edge(0.04, bh, -bw / 2, H.boardBottom + bh / 2); edge(0.04, bh, bw / 2, H.boardBottom + bh / 2);
  }

  // Pole and arm behind the board.
  const steel = new THREE.MeshStandardMaterial({ color: 0x3a4250, metalness: 0.6, roughness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, H.boardTop, 12), steel);
  pole.position.set(0, H.boardTop / 2, -1.3); g.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.3), steel);
  arm.position.set(0, H.boardBottom + 0.5, -0.67); g.add(arm);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.9, 14),
    new THREE.MeshStandardMaterial({ color: 0x1d428a, roughness: 0.8 }));
  pad.position.set(0, 0.95, -1.3); g.add(pad);

  // Rim and the bracket that holds it to the glass.
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xff4a1a, roughness: 0.4, metalness: 0.5, emissive: 0x330800 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(H.rimR, H.tubeR * 1.6, 10, 48), rimMat);
  rim.rotation.x = Math.PI / 2; rim.position.set(0, H.rimY, H.rimZ); g.add(rim);
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.16), rimMat);
  bracket.position.set(0, H.rimY - 0.01, H.boardZ + 0.08); g.add(bracket);

  // Net: diamond mesh made of line segments; vertices move when it swishes.
  const rings = [];
  for (let row = 0; row <= NET_ROWS; row++) {
    const t = row / NET_ROWS;
    const rad = H.rimR + (NET_BOTTOM_R - H.rimR) * t;
    const ring = [];
    for (let i = 0; i < NET_STRANDS; i++) {
      const a = (i + (row % 2) * 0.5) / NET_STRANDS * Math.PI * 2;
      ring.push(new THREE.Vector3(Math.cos(a) * rad, -t * H.netLen, Math.sin(a) * rad));
    }
    rings.push(ring);
  }
  const rest = rings.map(r => r.map(v => v.clone()));
  const segCount = NET_ROWS * NET_STRANDS * 2;
  const pos = new Float32Array(segCount * 2 * 3);
  const netGeo = new THREE.BufferGeometry();
  netGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const net = new THREE.LineSegments(netGeo, new THREE.LineBasicMaterial({ color: 0xf2f2f2, transparent: true, opacity: 0.9 }));
  net.position.set(0, H.rimY, H.rimZ);
  g.add(net);

  function writeNet() {
    let k = 0;
    const put = v => { pos[k++] = v.x; pos[k++] = v.y; pos[k++] = v.z; };
    for (let row = 0; row < NET_ROWS; row++) {
      for (let i = 0; i < NET_STRANDS; i++) {
        const a = rings[row][i], b1 = rings[row + 1][i];
        const b2 = rings[row + 1][(i + (row % 2 ? 1 : NET_STRANDS - 1)) % NET_STRANDS];
        put(a); put(b1); put(a); put(b2);
      }
    }
    netGeo.attributes.position.needsUpdate = true;
  }
  writeNet();

  // Simple net motion: a ball inside pushes strands outward and down; then they spring back.
  const vel = rings.map(r => r.map(() => new THREE.Vector3()));
  function updateNet(dt, ball) {
    let moving = false;
    for (let row = 1; row <= NET_ROWS; row++) {
      for (let i = 0; i < NET_STRANDS; i++) {
        const p = rings[row][i], r0 = rest[row][i], v = vel[row][i];
        if (ball) {
          const lx = ball.x, ly = ball.y - H.rimY, lz = ball.z - H.rimZ;
          const dx = p.x - lx, dy = p.y - ly, dz = p.z - lz;
          const d = Math.hypot(dx, dy, dz), reach = 0.17;
          if (d < reach && d > 1e-5) {
            const push = (reach - d) / reach * 1.4;
            p.x += dx / d * push * 0.04; p.z += dz / d * push * 0.04; p.y -= push * 0.025;
          }
        }
        v.x += (r0.x - p.x) * 140 * dt; v.y += (r0.y - p.y) * 140 * dt; v.z += (r0.z - p.z) * 140 * dt;
        v.multiplyScalar(Math.max(0, 1 - 9 * dt));
        p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
        if (Math.abs(p.x - r0.x) + Math.abs(p.y - r0.y) + Math.abs(p.z - r0.z) > 1e-4) moving = true;
      }
    }
    if (moving || ball) writeNet();
  }

  return { group: g, updateNet };
}
