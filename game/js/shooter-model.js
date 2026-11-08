// The real shooter: a rigged 3D model (Meshy, Mixamo skeleton) loaded from models/shooter.glb.
// Same interface as the placeholder in shooter.js: { group, setPose(t) },
// where t = 0 is the set point and 1 is the follow-through.
// The arms are posed in code each frame so they always meet the ball, whatever the flick.
import * as THREE from "../vendor/three.module.min.js";
import { GLTFLoader } from "../vendor/loaders/GLTFLoader.js";
import { RELEASE, SHOOTER } from "./config.js";

const v = () => new THREE.Vector3();

// Point `bone` so that `child` (one of its descendants) moves toward `target` (world space).
const _bp = v(), _cp = v(), _a = v(), _b = v(), _q = new THREE.Quaternion(), _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion();
function aim(bone, child, target) {
  bone.getWorldPosition(_bp);
  child.getWorldPosition(_cp);
  _a.subVectors(_cp, _bp).normalize();
  _b.subVectors(target, _bp).normalize();
  _q.setFromUnitVectors(_a, _b);
  bone.getWorldQuaternion(_wq);
  bone.parent.getWorldQuaternion(_pq).invert();
  bone.quaternion.copy(_pq.multiply(_q.multiply(_wq)));
  bone.updateMatrixWorld(true);
}

// Reads models/shooter.glb. Some hosts (like the Claude preview) won't serve .glb files,
// so it can also read the same model packed as text in models/shooter-data.js, if present.
async function fetchModel(url) {
  const r = await fetch(url).catch(() => null);
  if (r && r.ok) return r.arrayBuffer();
  const { default: b64 } = await import("../models/shooter-data.js");
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
}

export async function load(url = "models/shooter.glb") {
  const gltf = await new GLTFLoader().parseAsync(await fetchModel(url), "models/");
  const model = gltf.scene;

  // Scale to the shooter's height, face the hoop (-z), stand behind the line.
  const box = new THREE.Box3().setFromObject(model);
  const k = SHOOTER.height / (box.max.y - box.min.y);
  model.scale.setScalar(k);
  model.rotation.y = Math.PI;
  const group = new THREE.Group();
  group.add(model);
  group.position.set(SHOOTER.x, 0, SHOOTER.z);

  model.traverse(o => {
    if (o.isMesh) {
      o.frustumCulled = false;            // skinned meshes move outside their original bounds
      const m = o.material;
      // Meshy bakes lighting-ish colour into the texture; with no reflections to show,
      // a full metal setting just turns things black. Keep it matte cloth and skin.
      m.metalness = 0;
      m.roughness = 0.85;
      if (m.normalScale) m.normalScale.setScalar(0.8);
    }
  });

  const bone = name => {
    let found = null;
    model.traverse(o => { if (!found && o.isBone && o.name.replace(/[^A-Za-z]/g, "").endsWith(name)) found = o; });
    if (!found) throw new Error("model is missing bone " + name);
    return found;
  };
  const arms = [1, -1].map(sx => {
    const side = sx === 1 ? "Right" : "Left";   // model faces -z, so his right hand is on +x
    const a = { sx, upper: bone(side + "Arm"), fore: bone(side + "ForeArm"), hand: bone(side + "Hand"), tip: bone(side + "HandMiddle") };
    a.rest = [a.upper, a.fore, a.hand].map(b => b.quaternion.clone());
    // Which way each palm faces in the hand bone's own frame (checked against the mesh).
    a.palmAxis = sx === 1 ? v().set(0, 0, 1) : v().set(-1, 0, 0);
    return a;
  });
  group.updateMatrixWorld(true);
  const upperLen = arms[0].upper.getWorldPosition(v()).distanceTo(arms[0].fore.getWorldPosition(v()));
  const foreLen = arms[0].fore.getWorldPosition(v()).distanceTo(arms[0].hand.getWorldPosition(v()));

  // Hand placement. At the set point each palm rests on the ball's surface:
  // the shooting hand behind and under it, the guide hand on its left side.
  // n = direction from ball centre to where the palm touches; fingers run up along the surface.
  const R = RELEASE, BALL = new THREE.Vector3(R.x, R.y, R.z), RAD = 0.12, GAP = 0.025;
  function onBall(n, fingersUp) {
    n = n.clone().normalize();
    const f = fingersUp.clone().addScaledVector(n, -fingersUp.dot(n)).normalize();
    const palm = BALL.clone().addScaledVector(n, RAD + GAP);
    return {
      wrist: palm.clone().addScaledVector(f, -0.065).addScaledVector(n, 0.015),
      fingers: palm.clone().addScaledVector(f, 0.11).addScaledVector(n, -0.015),
      palm: n.clone().negate(),           // palm faces the ball
    };
  }
  const P = {
    set: {
      [1]: onBall(v().set(0.05, -0.55, 0.83), v().set(0, 1, -0.15)),
      [-1]: onBall(v().set(-0.9, 0.12, 0.38), v().set(0.35, 1, -0.1)),
    },
    follow: {   // arms up toward the hoop, shooting wrist snapped down
      [1]: { wrist: v().set(R.x + 0.05, R.y - 0.02, R.z - 0.12), fingers: v().set(R.x + 0.05, R.y - 0.1, R.z - 0.26), palm: v().set(0, -0.55, -0.84) },
      [-1]: { wrist: v().set(R.x - 0.2, R.y - 0.08, R.z - 0.02), fingers: v().set(R.x - 0.22, R.y + 0.05, R.z - 0.06), palm: v().set(1, 0, 0) },
    },
  };

  // Turn the hand around its own length so the palm faces `want`.
  const _ax = v(), _cur = v(), _w = v(), _tq = new THREE.Quaternion(), _hq = new THREE.Quaternion(), _hp = new THREE.Quaternion();
  function twist(a, want) {
    a.hand.getWorldPosition(_bp); a.tip.getWorldPosition(_cp);
    _ax.subVectors(_cp, _bp).normalize();
    a.hand.getWorldQuaternion(_hq);
    _cur.copy(a.palmAxis).applyQuaternion(_hq);
    _cur.addScaledVector(_ax, -_cur.dot(_ax)).normalize();
    _w.copy(want).addScaledVector(_ax, -want.dot(_ax)).normalize();
    let ang = Math.acos(Math.max(-1, Math.min(1, _cur.dot(_w))));
    if (_ax.dot(_cur.clone().cross(_w)) < 0) ang = -ang;
    _tq.setFromAxisAngle(_ax, ang);
    a.hand.parent.getWorldQuaternion(_hp).invert();
    a.hand.quaternion.copy(_hp.multiply(_tq.multiply(_hq)));
    a.hand.updateMatrixWorld(true);
  }

  const S = v(), T = v(), F = v(), N = v(), E = v(), u = v(), perp = v(), pole = v();
  function setPose(t) {
    for (const a of arms) {
      a.upper.quaternion.copy(a.rest[0]); a.fore.quaternion.copy(a.rest[1]); a.hand.quaternion.copy(a.rest[2]);
      a.upper.updateMatrixWorld(true);
      const p0 = P.set[a.sx], p1 = P.follow[a.sx];
      T.lerpVectors(p0.wrist, p1.wrist, t);
      F.lerpVectors(p0.fingers, p1.fingers, t);
      N.lerpVectors(p0.palm, p1.palm, t).normalize();
      // Two-bone reach: find the elbow, pointing down, out and a little toward the hoop.
      a.upper.getWorldPosition(S);
      const d = Math.min(S.distanceTo(T), (upperLen + foreLen) * 0.999);
      u.subVectors(T, S).normalize();
      const x = (upperLen * upperLen - foreLen * foreLen + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, upperLen * upperLen - x * x));
      pole.set(a.sx * 0.45, -1, -0.25);
      perp.copy(pole).addScaledVector(u, -pole.dot(u)).normalize();
      E.copy(S).addScaledVector(u, x).addScaledVector(perp, h);
      aim(a.upper, a.fore, E);
      aim(a.fore, a.hand, T);
      aim(a.hand, a.tip, F);
      twist(a, N);
    }
  }
  setPose(0);
  return { group, setPose };
}
