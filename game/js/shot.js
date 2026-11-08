// Turns a finger flick into a launch. No Three.js, so it can be tested in Node.
//
// How it works:
// 1. Work out the exact launch that drops the ball dead centre (the "ideal").
// 2. Measure how far the flick is from a perfect one: power (speed) and aim (angle).
// 3. Shrink small errors a lot and big errors a little ("forgiveness"),
//    then apply what's left to the ideal launch.
// The physics then decides what happens, so every result is earned.

import { HOOP } from "./physics.js";

export const DEFAULTS = {
  forgiveness: 0.6,    // 0 = strict, 1 = very generous
  targetSpeed: 1.9,    // flick speed for a perfect shot, in screen-heights per second
  aimSens: 1.1,        // how much left/right angle matters
  powerSens: 1.1,      // how much speed matters
  launchDeg: 52,       // arc of every shot
  windowMs: 90,        // only the last part of the flick counts
  gravity: 9.81,
  backspin: 2.2,       // revolutions per second
};

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// samples: [{x, y, t}] in CSS pixels and ms, oldest first. h = screen height in px.
export function readFlick(samples, h, set = DEFAULTS) {
  if (samples.length < 2) return { ok: false, why: "tap" };
  const a = samples[0], b = samples[samples.length - 1];
  const up = (a.y - b.y) / h;                  // screen heights moved upward
  if (up < 0.05) return { ok: false, why: "short" };

  // Fingers often pause or ease off just before lifting. Drop that slow tail
  // (anything under a third of the peak speed), then measure the average
  // velocity over the last `windowMs` of what's left.
  let peak = 0;
  const seg = [];
  for (let j = 1; j < samples.length; j++) {
    const dt = Math.max(1, samples[j].t - samples[j - 1].t);
    const sp = (samples[j - 1].y - samples[j].y) / dt;
    seg.push(sp); if (sp > peak) peak = sp;
  }
  let end = samples.length - 1;
  while (end > 1 && seg[end - 1] < peak / 3) end--;
  const e = samples[end];
  let i = end;
  while (i > 0 && e.t - samples[i - 1].t <= set.windowMs) i--;
  if (i === end) i = Math.max(0, end - 1);
  const s = samples[i], wdt = Math.max(8, e.t - s.t) / 1000;
  const vy = (s.y - e.y) / h / wdt;            // screen heights / second, up = positive
  const vx = (e.x - s.x) / h / wdt;
  if (vy < 0.4) return { ok: false, why: "slow" };

  // Distance adds a little: a long confident stroke reads slightly stronger.
  const distFactor = 0.88 + 0.12 * clamp(up / 0.3, 0, 1.4);
  const speed = vy * distFactor;

  // Aim: blend the whole-stroke direction with the release direction.
  const aimWhole = Math.atan2(b.x - a.x, a.y - b.y);
  const aimEnd = Math.atan2(vx, vy);
  const aim = 0.5 * aimWhole + 0.5 * aimEnd;

  return { ok: true, speed, power: speed / set.targetSpeed, aim, up, ms: b.t - a.t };
}

// The ideal launch speed for a given arc, from `from` to the rim centre.
export function idealSpeed(from, set = DEFAULTS) {
  const d = Math.hypot(from.x, from.z - HOOP.rimZ + AIM_DEEP);
  const dy = HOOP.rimY - from.y;
  const th = set.launchDeg * Math.PI / 180;
  const c = Math.cos(th);
  return Math.sqrt(set.gravity * d * d / (2 * c * c * (d * Math.tan(th) - dy)));
}

// Small errors shrink to almost nothing; big ones keep most of their size.
// Past `knee`, errors grow at full slope again so a bad flick is clearly a miss.
function soften(e, s, knee) {
  const a = Math.abs(e);
  return Math.sign(e) * (a * a / (a + s) + Math.max(0, a - knee) * 1.2);
}

// Aim a touch past the rim centre, like real shooters do: back rim is kinder than front.
const AIM_DEEP = 0.04;

export function launch(flick, from, set = DEFAULTS) {
  const f = clamp(set.forgiveness, 0, 1);
  // Forgiveness sets both how much small errors shrink and how much any error carries through.
  const gain = 0.6 - 0.4 * f;
  const powerErr = soften(flick.power - 1, 0.01 + 0.12 * f, 0.15) * gain * set.powerSens;
  const aimErr = soften(flick.aim, 0.015 + 0.16 * f, 0.3) * gain * set.aimSens;

  const v = idealSpeed(from, set) * (1 + powerErr);
  const th = set.launchDeg * Math.PI / 180;
  const base = Math.atan2(-from.x, from.z - HOOP.rimZ + AIM_DEEP); // straight at the rim
  const yaw = base + aimErr;
  const vh = v * Math.cos(th);
  return {
    vel: { x: vh * Math.sin(yaw), y: v * Math.sin(th), z: -vh * Math.cos(yaw) },
    spin: { x: set.backspin * 2 * Math.PI, y: 0, z: 0 },
    powerErr, aimErr,
  };
}
