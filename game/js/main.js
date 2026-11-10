// Shoot Around — Phase 1: one court, one shooter, one ball, the flick, physics, makes and misses.
import * as THREE from "../vendor/three.module.min.js";
import { createShot, step, classify, STEP } from "./physics.js";
import { readFlick, launch } from "./shot.js";
import { RELEASE, CAMERA, LOOK_AT } from "./config.js";
import { flickInput } from "./input.js";
import { loadSettings, mountPanel } from "./tuning.js";
import * as hoopKit from "./hoop.js";
import * as ballKit from "./ball.js";
import * as shooterKit from "./shooter.js";
import * as spriteShooter from "./sprite-shooter.js";

const $ = s => document.querySelector(s);
const canvas = $("#scene");
const set = loadSettings();

// ---------- Scene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;   // courts can raise this (see court.exposure below)

const scene = new THREE.Scene();
// Which court: ?court=south-philly | waterfront | center-city (the hub's picker sets it).
export const COURTS = { "south-philly": "south-philly-street", waterfront: "waterfront", "center-city": "center-city" };
const courtKey = COURTS[new URLSearchParams(location.search).get("court")] ? new URLSearchParams(location.search).get("court") : "waterfront";
const courtMod = await import(`./courts/${COURTS[courtKey]}.js`);
const court = courtMod.build();
scene.add(court.group);
scene.background = court.background;
scene.fog = court.fog;
if (court.exposure) renderer.toneMappingExposure = court.exposure;
if (court.shadows) {
  // Shadows are drawn once ("baked") since the court never moves; the ball uses its own soft spot.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
}

const hoop = hoopKit.build(court.hoop); scene.add(hoop.group);   // courts can choose the backboard style
hoop.group.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
const ball = ballKit.build(); scene.add(ball.mesh, ball.shadow);
if (court.ballGlow) { ball.mesh.material.emissive.set(0x5a2a10); ball.mesh.material.emissiveIntensity = court.ballGlow; }   // keeps the ball readable at night
// Start with the simple placeholder, then swap in the 3D model once it has downloaded.
// Start with the simple placeholder, then swap in the animated shooter once it has downloaded.
// The animation holds the ball itself until release, so the game's ball hides until then.
let shooter = shooterKit.build(); scene.add(shooter.group);
spriteShooter.load().then(m => {
  scene.remove(shooter.group);
  shooter = m; scene.add(m.group);
  Object.assign(RELEASE, m.release);          // the game's ball starts where the drawing lets go
  if (court.shooterTint) m.tint(court.shooterTint);
  if (state === "ready") { m.setFrame(spriteShooter.STAND); ball.mesh.visible = ball.shadow.visible = false; }
}).catch(e => console.warn("Shooter animation didn't load; keeping the placeholder.", e));
const isSprite = () => shooter.kind === "sprite";

// Plays a list of animation frames and holds the last one. onFrame runs as each frame shows.
let anim = null;
function play(seq, onFrame) { anim = { ...seq, i: 0, t: 0, onFrame }; shooter.setFrame(seq.frames[0]); onFrame?.(seq.frames[0]); }
function stepAnim(dt) {
  if (!anim) return;
  anim.t += dt * 1000;
  while (anim && anim.i < anim.ms.length && anim.t >= anim.ms[anim.i]) {
    anim.t -= anim.ms[anim.i]; anim.i++;
    const f = anim.frames[anim.i], cb = anim.onFrame;
    shooter.setFrame(f);
    if (anim.i === anim.ms.length) anim = null;
    cb?.(f);
  }
}

// Near plane at 1 m: the closest thing ever in view is the floor about 5 m ahead, and a tighter
// near plane gives the depth buffer 4x the precision, so flat layers on the floor don't flicker.
const camera = new THREE.PerspectiveCamera(50, 1, 1.0, 4000);   // far enough for distant skylines
const lookAt = new THREE.Vector3(LOOK_AT.x, LOOK_AT.y, LOOK_AT.z);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // Keep the backboard in frame on narrow phones: widen the view when the screen is skinny.
  camera.fov = w / h < 0.5 ? 46 : w / h < 0.62 ? 42 : 38;
  camera.position.set(CAMERA.x, CAMERA.y, CAMERA.z);
  camera.lookAt(lookAt);
  camera.updateProjectionMatrix();
  trail.width = w * devicePixelRatio; trail.height = h * devicePixelRatio;
}

// ---------- HUD ----------
const trail = $("#trail"), tctx = trail.getContext("2d");
const hud = { makes: $("#makes"), shots: $("#shots"), streak: $("#streak"), best: $("#best"), banner: $("#banner"), hint: $("#hint"), debug: $("#debug") };
const BEST_KEY = "shootAround.bestStreak";
const stats = { makes: 0, shots: 0, streak: 0, best: Number(localStorage.getItem(BEST_KEY) || 0) };
function paintStats() {
  hud.makes.textContent = stats.makes; hud.shots.textContent = stats.shots;
  hud.streak.textContent = stats.streak; hud.best.textContent = stats.best;
}
function banner(text, made, kind) {
  const b = hud.banner;
  b.textContent = text;
  b.className = "banner " + (made ? "made" : "miss") + (kind === "swish" ? " swish" : "");
  void b.offsetWidth; b.classList.add("show");
}
let debugOn = false;
mountPanel($("#panel"), set, { onDebug: on => { debugOn = on; hud.debug.hidden = !on; } });
$("#gear").addEventListener("click", () => { $("#panel").hidden = !$("#panel").hidden; });
$("#close").addEventListener("click", () => {
  if (window.parent !== window) window.parent.postMessage({ type: "shoot-close" }, "*");
  else location.href = "../#shoot";
});

// Finger streak.
let strokes = [];
function drawTrail(now) {
  tctx.clearRect(0, 0, trail.width, trail.height);
  const k = devicePixelRatio;
  strokes = strokes.filter(s => !s.end || now - s.end < 350);
  for (const s of strokes) {
    const fade = s.end ? 1 - (now - s.end) / 350 : 1;
    const pts = s.pts;
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length;
      tctx.strokeStyle = `rgba(255,255,255,${0.55 * fade * t})`;
      tctx.lineWidth = (4 + 10 * t) * k;
      tctx.lineCap = "round";
      tctx.beginPath(); tctx.moveTo(pts[i - 1].x * k, pts[i - 1].y * k); tctx.lineTo(pts[i].x * k, pts[i].y * k); tctx.stroke();
    }
  }
}

// ---------- Game state ----------
// ready: ball in hands, waiting for a flick. flight: physics running. reset: ball coming back.
let state = "ready", shot = null, poseT = 0, poseTarget = 0, resetT = 0, shownResult = false;
let lastRim = 0, lastBoard = 0;
const spinAxis = new THREE.Vector3(1, 0, 0);

function holdBall() {
  ball.place(RELEASE);
  ball.mesh.scale.setScalar(1);
}
holdBall();

flickInput(canvas, {
  canStart: () => state === "ready" && $("#panel").hidden,
  onMove: pts => {
    if (!strokes.length || strokes[strokes.length - 1].end) strokes.push({ pts, end: 0 });
    else strokes[strokes.length - 1].pts = pts;
  },
  onFlick: samples => {
    if (strokes.length) strokes[strokes.length - 1].end = performance.now();
    const f = readFlick(samples, window.innerHeight, set);
    if (debugOn) hud.debug.textContent = f.ok
      ? `speed ${f.speed.toFixed(2)}  power ${(f.power * 100).toFixed(0)}%  aim ${(f.aim * 180 / Math.PI).toFixed(1)}°  ${f.ms.toFixed(0)}ms`
      : `no shot (${f.why})`;
    if (!f.ok) { if (f.why !== "tap") nudgeHint(); return; }
    const l = launch(f, RELEASE, set);
    const go = () => {
      shot = createShot(RELEASE, l.vel, l.spin);
      state = "flight"; poseTarget = 1; shownResult = false; lastRim = 0; lastBoard = 0; acc = 0;
    };
    if (isSprite()) {
      // The flick starts his motion; the ball leaves his hands when the animation reaches the release.
      state = "windup";
      play(spriteShooter.SHOOT_SEQ, fr => {
        if (fr === spriteShooter.RELEASE_FRAME) { ball.mesh.visible = ball.shadow.visible = true; ball.place(RELEASE); go(); }
      });
    } else go();
    hud.hint.classList.add("gone");
    if (debugOn) hud.debug.textContent += `  → speed ${(l.powerErr * 100).toFixed(1)}%  aim ${(l.aimErr * 180 / Math.PI).toFixed(2)}°`;
  },
});
function nudgeHint() {
  hud.hint.firstElementChild.textContent = "Flick up — quick and straight";
  hud.hint.classList.remove("gone", "nudge"); void hud.hint.offsetWidth; hud.hint.classList.add("nudge");
}

function finishShot(res) {
  stats.shots++;
  if (res.made) { stats.makes++; stats.streak++; } else stats.streak = 0;
  if (stats.streak > stats.best) { stats.best = stats.streak; try { localStorage.setItem(BEST_KEY, stats.best); } catch (_) {} }
  paintStats();
  if (debugOn) hud.debug.textContent += `  [${res.kind}]`;
}

// ---------- Loop ----------
// ?test lets slow test machines run physics at real speed.
const DT_CAP = new URLSearchParams(location.search).has("test") ? 0.5 : 0.05;
let acc = 0, last = performance.now(), running = true;
function frame(now) {
  if (!running) return;
  const dt = Math.min(DT_CAP, (now - last) / 1000); last = now;

  if (state === "flight" && shot) {
    acc += dt;
    while (acc >= STEP) { step(shot, STEP, set.gravity); acc -= STEP; }
    ball.place(shot.p);
    ball.mesh.rotateOnWorldAxis(spinAxis, shot.w.x * dt);
    if (shot.rim.length > lastRim) { lastRim = shot.rim.length; if (navigator.vibrate) navigator.vibrate(8); }
    if (shot.board.length > lastBoard) lastBoard = shot.board.length;
    if (shot.made && !shownResult) {
      shownResult = true;
      const r = shot.result || classifyNow();
      banner(r.label, true, r.kind);
      if (navigator.vibrate) navigator.vibrate(r.kind === "swish" ? [20, 40, 30] : 25);
    }
    if (shot.done) {
      if (!shot.made) banner(shot.result.label, false, shot.result.kind);
      finishShot(shot.result);
      state = "reset"; resetT = 0; poseTarget = 0;
    }
  } else if (state === "reset" && isSprite()) {
    // Ball leaves the scene; he gathers the next one and comes back up to the set point.
    resetT += dt;
    if (resetT > 0.45) {
      // Ball's gone; he's back standing with the next one, ready to shoot.
      holdBall();
      ball.mesh.visible = ball.shadow.visible = false;
      shooter.setFrame(spriteShooter.STAND);
      state = "ready"; acc = 0;
    }
  } else if (state === "reset") {
    resetT += dt;
    if (resetT > 0.35) {
      // Pop the ball back into the shooter's hands.
      holdBall();
      const k = Math.min(1, (resetT - 0.35) / 0.18);
      ball.mesh.scale.setScalar(0.3 + 0.7 * k);
      if (k >= 1) { state = "ready"; acc = 0; }
    }
  }

  // Arms: snap up on release, ease back down after.
  poseT += (poseTarget - poseT) * Math.min(1, dt * (poseTarget > poseT ? 18 : 5));
  if (isSprite()) stepAnim(dt); else shooter.setPose(poseT);

  court.update?.(dt);
  hoop.updateNet(dt, state === "flight" && shot && shot.p.y < 3.2 ? shot.p : null);
  drawTrail(now);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
// The label for a made shot is known the moment it drops; classify early so the banner is instant.
function classifyNow() { return classify(shot); }

document.addEventListener("visibilitychange", () => {
  running = !document.hidden;
  if (running) { last = performance.now(); requestAnimationFrame(frame); }
});
window.addEventListener("resize", resize);
resize();
paintStats();
requestAnimationFrame(frame);
window.__shoot = { set, stats, camera, renderer, scene, courtKey, get shooter() { return shooter; }, get state() { return state; }, get shot() { return shot; } }; // for testing
