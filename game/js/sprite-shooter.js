// The shooter as a pre-rendered animation (like classic arcade basketball games):
// frames cut from a green-screen clip, packed into sprites/shooter.webp, shown on a flat
// card in the 3D court facing the camera. The hands look right because they're drawn that way.
//
// Frames: 0 stand · 1 dip · 2 ball low · 3 ball rising · 4 set point (holding the ball)
//         5 release (ball removed: the game's ball takes over here) · 6-8 follow-through.
import * as THREE from "../vendor/three.module.min.js";
import { canvasTexture } from "./util.js";
import { SHOOTER, CAMERA, RELEASE } from "./config.js";

export const SET = 4, RELEASE_FRAME = 5;
export const SHOOT_SEQ = { frames: [5, 6, 7, 8], ms: [70, 90, 110] };
export const RESET_SEQ = { frames: [0, 1, 2, 3, 4], ms: [130, 130, 130, 130] };

export async function load() {
  const [meta, tex] = await Promise.all([
    fetch("sprites/shooter.json").then(r => { if (!r.ok) throw new Error("sprite data"); return r.json(); }),
    new THREE.TextureLoader().loadAsync("sprites/shooter.webp"),
  ]);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1 / meta.cols, 1 / meta.rows);
  tex.anisotropy = 4;

  // Scale from his standing height; line the release-frame ball up with x = 0.
  const mpp = SHOOTER.height / (meta.sole - meta.headTop);
  const ref = meta.balls[RELEASE_FRAME];
  const wx = px => (px - ref.x) * mpp;
  const wy = py => (meta.sole - py) * mpp;

  const card = new THREE.Mesh(
    new THREE.PlaneGeometry(meta.fw * mpp, meta.fh * mpp),
    // Unlit and slightly dimmed so the studio-lit frames sit in the night scene.
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, color: 0xd9dbe4, toneMapped: false, fog: false }),
  );
  card.position.set(wx(meta.fw / 2), wy(meta.fh / 2), SHOOTER.z);

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.42), new THREE.MeshBasicMaterial({
    map: canvasTexture(128, 64, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      gr.addColorStop(0, "rgba(0,0,0,0.6)"); gr.addColorStop(1, "rgba(0,0,0,0)");
      g.setTransform(1, 0, 0, 0.5, 0, h / 4); g.fillStyle = gr; g.fillRect(0, 0, w, w);
    }),
    transparent: true, depthWrite: false,
  }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(wx(meta.bodyX), 0.012, SHOOTER.z - 0.05);

  const group = new THREE.Group();
  group.add(shadow, card);

  function setFrame(i) {
    tex.offset.set((i % meta.cols) / meta.cols, 1 - (Math.floor(i / meta.cols) + 1) / meta.rows);
  }
  setFrame(SET);

  // Where the game's ball starts: on the line from the camera through the drawn ball,
  // a little in front of the card, so it appears exactly where the drawing had it.
  const onCard = new THREE.Vector3(wx(ref.x), wy(ref.y), SHOOTER.z);
  const cam = new THREE.Vector3(CAMERA.x, CAMERA.y, CAMERA.z);
  const releaseZ = SHOOTER.z - 0.24;
  const k = (cam.z - releaseZ) / (cam.z - onCard.z);
  const release = cam.clone().lerp(onCard, k);

  return { kind: "sprite", group, setFrame, release: { x: release.x, y: release.y, z: release.z } };
}
