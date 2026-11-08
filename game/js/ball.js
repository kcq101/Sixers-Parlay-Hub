import * as THREE from "../vendor/three.module.min.js";
import { canvasTexture, rng } from "./util.js";
import { BALL_R } from "./physics.js";

export function build() {
  const tex = canvasTexture(1024, 512, (g, w, h) => {
    const r = rng(3);
    g.fillStyle = "#d4561c"; g.fillRect(0, 0, w, h);
    // Pebbled leather.
    for (let i = 0; i < 60000; i++) {
      g.fillStyle = r() < 0.5 ? "rgba(0,0,0,0.14)" : "rgba(255,170,110,0.12)";
      g.fillRect(r() * w, r() * h, 2, 2);
    }
    g.strokeStyle = "#1b0d06"; g.lineWidth = 9; g.lineCap = "round";
    // Equator and one meridian ring.
    g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
    for (const x of [w * 0.25, w * 0.75]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    // The two curved seams.
    for (const off of [0, w / 2]) {
      g.beginPath();
      for (let y = 0; y <= h; y += 4) {
        const t = y / h;
        const x = off + w * 0.25 + Math.sin(t * Math.PI) * w * 0.17 * (off ? -1 : 1);
        y === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 40, 28),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, metalness: 0 }));
  mesh.rotation.set(0.3, 0.6, 0);

  // Soft round shadow that sits on the floor under the ball.
  const shadowTex = canvasTexture(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(0,0,0,0.75)"); gr.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(BALL_R * 3.2, BALL_R * 3.2),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.01;

  function place(p) {
    mesh.position.set(p.x, p.y, p.z);
    shadow.position.set(p.x, 0.01, p.z);
    const k = Math.max(0.35, 1.6 - p.y * 0.35);
    shadow.scale.setScalar(k);
    shadow.material.opacity = Math.max(0.15, 1 - p.y * 0.22);
  }
  return { mesh, shadow, place };
}
