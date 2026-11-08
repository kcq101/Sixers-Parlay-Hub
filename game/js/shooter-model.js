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

export async function load(url = "models/shooter.glb") {
  const gltf = await new GLTFLoader().loadAsync(url);
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
    return a;
  });
  group.updateMatrixWorld(true);
  const upperLen = arms[0].upper.getWorldPosition(v()).distanceTo(arms[0].fore.getWorldPosition(v()));
  const foreLen = arms[0].fore.getWorldPosition(v()).distanceTo(arms[0].hand.getWorldPosition(v()));

  // Wrist targets around the ball (world space), and where the fingers point.
  const R = RELEASE;
  const P = {
    set: {
      [1]: { wrist: v().set(R.x + 0.03, R.y - 0.1, R.z + 0.11), fingers: v().set(R.x, R.y + 0.02, R.z) },
      [-1]: { wrist: v().set(R.x - 0.13, R.y - 0.05, R.z + 0.02), fingers: v().set(R.x - 0.11, R.y + 0.12, R.z - 0.02) },
    },
    follow: {
      [1]: { wrist: v().set(R.x + 0.05, R.y - 0.02, R.z - 0.12), fingers: v().set(R.x + 0.05, R.y - 0.1, R.z - 0.26) },
      [-1]: { wrist: v().set(R.x - 0.2, R.y - 0.08, R.z - 0.02), fingers: v().set(R.x - 0.22, R.y + 0.05, R.z - 0.06) },
    },
  };

  const S = v(), T = v(), F = v(), E = v(), u = v(), perp = v(), pole = v();
  function setPose(t) {
    for (const a of arms) {
      a.upper.quaternion.copy(a.rest[0]); a.fore.quaternion.copy(a.rest[1]); a.hand.quaternion.copy(a.rest[2]);
      a.upper.updateMatrixWorld(true);
      T.lerpVectors(P.set[a.sx].wrist, P.follow[a.sx].wrist, t);
      F.lerpVectors(P.set[a.sx].fingers, P.follow[a.sx].fingers, t);
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
    }
  }
  setPose(0);
  return { group, setPose };
}
