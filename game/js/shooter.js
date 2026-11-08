// Placeholder shooter: a simple player seen from behind, built from basic shapes.
// Swap this file for a licensed 3D model later; the game only uses
// build() -> { group, setPose(t) } where t = 0 is "set" and 1 is "follow-through".
import * as THREE from "../vendor/three.module.min.js";
import { canvasTexture } from "./util.js";
import { RELEASE } from "./config.js";

// The ball sits over the right side of the head, so the body is shifted left of the ball.
const BODY_X = -0.16, BODY_Z = 4.64, SHOULDER_Y = 1.58, UPPER = 0.33, FORE = 0.32;
const Y = new THREE.Vector3(0, 1, 0);

function limb(mat, r1, r2) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, 1, 10), mat);
  return m;
}
function between(mesh, a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  mesh.position.copy(a).addScaledVector(d, 0.5);
  mesh.scale.set(1, d.length(), 1);
  mesh.quaternion.setFromUnitVectors(Y, d.normalize());
}

// Two-bone reach: where the elbow goes so the hand lands on the target.
function elbowFor(s, t, pole) {
  const d = Math.min(s.distanceTo(t), (UPPER + FORE) * 0.999);
  const u = new THREE.Vector3().subVectors(t, s).normalize();
  const x = (UPPER * UPPER - FORE * FORE + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, UPPER * UPPER - x * x));
  const perp = pole.clone().addScaledVector(u, -pole.dot(u)).normalize();
  return s.clone().addScaledVector(u, x).addScaledVector(perp, h);
}

export function build() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x6b4630, roughness: 0.65 });
  const jerseyTex = canvasTexture(256, 256, (c, w, h) => {
    c.fillStyle = "#f3f4f7"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#1d428a"; c.fillRect(0, 0, 18, h); c.fillRect(w - 18, 0, 18, h);
    c.fillStyle = "#ed174c"; c.fillRect(18, 0, 8, h); c.fillRect(w - 26, 0, 8, h);
  });
  const jersey = new THREE.MeshStandardMaterial({ map: jerseyTex, roughness: 0.8 });
  const shorts = new THREE.MeshStandardMaterial({ color: 0x1d428a, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15151a, roughness: 0.7 });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.6, 0.26), jersey);
  torso.position.set(0, SHOULDER_Y - 0.33, BODY_Z); g.add(torso);
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.34, 0.27), shorts);
  hips.position.set(0, SHOULDER_Y - 0.78, BODY_Z); g.add(hips);
  for (const sx of [-1, 1]) {
    const leg = limb(skin, 0.075, 0.06);
    between(leg, new THREE.Vector3(sx * 0.12, SHOULDER_Y - 0.92, BODY_Z), new THREE.Vector3(sx * 0.14, 0.1, BODY_Z));
    g.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.28), dark);
    shoe.position.set(sx * 0.14, 0.05, BODY_Z - 0.06); g.add(shoe);
  }
  const neck = limb(skin, 0.06, 0.065);
  between(neck, new THREE.Vector3(0, SHOULDER_Y - 0.04, BODY_Z), new THREE.Vector3(0, SHOULDER_Y + 0.1, BODY_Z));
  g.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), skin);
  head.scale.set(1, 1.12, 1.05);
  head.position.set(0, SHOULDER_Y + 0.21, BODY_Z); g.add(head);

  // Arms are re-posed every frame.
  const arms = [-1, 1].map(sx => {
    const up = limb(skin, 0.05, 0.042), fore = limb(skin, 0.042, 0.035);
    const sleeve = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), jersey);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), skin);
    hand.scale.set(1, 1.3, 0.7);
    g.add(up, fore, sleeve, hand);
    return { sx, up, fore, sleeve, hand, s: new THREE.Vector3(sx * 0.24, SHOULDER_Y, BODY_Z) };
  });

  // Hand targets. Right hand is the shooting hand (behind the ball); left is the guide hand.
  const R = RELEASE;
  const poses = {
    set: { [1]: new THREE.Vector3(0.05, R.y - 0.08, R.z + 0.1), [-1]: new THREE.Vector3(-0.12, R.y - 0.01, R.z + 0.03) },
    follow: { [1]: new THREE.Vector3(0.04, SHOULDER_Y + 0.56, BODY_Z - 0.34), [-1]: new THREE.Vector3(-0.22, SHOULDER_Y + 0.52, BODY_Z - 0.16) },
  };
  const tmp = new THREE.Vector3();
  function setPose(t) {
    for (const a of arms) {
      tmp.lerpVectors(poses.set[a.sx], poses.follow[a.sx], t);
      tmp.x -= BODY_X;
      const pole = new THREE.Vector3(a.sx * 1, -0.6, 0.5);
      const e = elbowFor(a.s, tmp, pole);
      const hand = a.s.clone().add(tmp.clone().sub(a.s).clampLength(0, UPPER + FORE));
      between(a.up, a.s, e);
      between(a.fore, e, hand);
      a.sleeve.position.copy(a.s);
      a.hand.position.copy(hand);
    }
  }
  g.position.x = BODY_X;
  setPose(0);
  return { group: g, setPose };
}
