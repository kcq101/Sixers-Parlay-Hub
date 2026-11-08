// Ball physics for Shoot Around. Plain math, no Three.js, so it can be tested in Node.
// Units are metres and seconds. x = right, y = up, z = toward the shooter.
// The backboard's front face sits at z = 0.

export const HOOP = {
  rimY: 3.048,          // 10 ft
  rimR: 0.2286,         // 18 in diameter, measured to the middle of the rim tube
  tubeR: 0.01,          // rim tube thickness
  rimZ: 0.15 + 0.2286,  // rim centre: 6 in off the glass + radius
  boardZ: 0,
  boardHalfW: 0.915,    // 6 ft wide
  boardBottom: 2.90,
  boardTop: 3.97,
  netLen: 0.42,
};
export const BALL_R = 0.12;
export const FREE_THROW_Z = 4.57; // 15 ft from the glass

const E_RIM = 0.55, MU_RIM = 0.18;
const E_BOARD = 0.6, E_FLOOR = 0.72;
export const STEP = 1 / 240;

function v3(x = 0, y = 0, z = 0) { return { x, y, z }; }

export function createShot(pos, vel, spin) {
  return {
    p: v3(pos.x, pos.y, pos.z),
    v: v3(vel.x, vel.y, vel.z),
    w: v3(spin.x, spin.y, spin.z),     // angular velocity, rad/s (for drawing + rim bite)
    t: 0,
    rim: [],          // {t, side, imp}
    board: [],        // {t, imp}
    floorHits: 0,
    floorT: 0,
    made: false,
    madeT: 0,
    inNet: false,
    cross: null,      // where the ball was when it first came down through rim height
    peakY: pos.y,
    done: false,
    result: null,
  };
}

function rimSide(dx, dz) {
  if (Math.abs(dz) >= Math.abs(dx)) return dz > 0 ? "front" : "back";
  return dx < 0 ? "left" : "right";
}

export function step(s, dt = STEP, g = 9.81) {
  const H = HOOP, R = BALL_R, p = s.p, v = s.v;
  const prevY = p.y;

  v.y -= g * dt;
  p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
  s.t += dt;
  if (p.y > s.peakY) s.peakY = p.y;

  // Rim: closest point on the rim circle, then sphere vs. tube.
  let dx = p.x, dz = p.z - H.rimZ;
  let hd = Math.hypot(dx, dz);
  {
    const ux = hd > 1e-6 ? dx / hd : 1, uz = hd > 1e-6 ? dz / hd : 0;
    const cx = H.rimR * ux, cz = H.rimZ + H.rimR * uz;
    let nx = p.x - cx, ny = p.y - H.rimY, nz = p.z - cz;
    const d = Math.hypot(nx, ny, nz), min = R + H.tubeR;
    if (d < min && d > 1e-9) {
      nx /= d; ny /= d; nz /= d;
      p.x += nx * (min - d); p.y += ny * (min - d); p.z += nz * (min - d);
      const vn = v.x * nx + v.y * ny + v.z * nz;
      if (vn < 0) {
        // Bounce off the normal, scrub some sliding speed, and let backspin
        // pull the ball back toward the shooter a little (the "soft roll").
        let tx = v.x - vn * nx, ty = v.y - vn * ny, tz = v.z - vn * nz;
        tx *= 1 - MU_RIM; ty *= 1 - MU_RIM; tz *= 1 - MU_RIM;
        const bite = Math.min(1, Math.abs(s.w.x) / 40) * 0.12 * Math.abs(vn);
        v.x = tx - E_RIM * vn * nx;
        v.y = ty - E_RIM * vn * ny;
        v.z = tz - E_RIM * vn * nz + bite;
        s.w.x *= 0.6;
        const last = s.rim[s.rim.length - 1];
        if (!last || s.t - last.t > 0.03) s.rim.push({ t: s.t, side: rimSide(cx, cz - H.rimZ), imp: -vn });
      }
    }
  }

  // Backboard front face.
  if (p.z - R < H.boardZ && p.z > H.boardZ - 0.25 && v.z < 0 &&
      Math.abs(p.x) < H.boardHalfW + R * 0.5 && p.y > H.boardBottom - R * 0.5 && p.y < H.boardTop + R * 0.5) {
    p.z = H.boardZ + R;
    const imp = -v.z;
    v.z = imp * E_BOARD; v.x *= 0.88; v.y *= 0.88;
    s.w.x *= 0.5;
    s.board.push({ t: s.t, imp });
  }

  // Floor.
  if (p.y - R < 0) {
    p.y = R;
    if (v.y < 0) {
      v.y = -v.y * E_FLOOR; v.x *= 0.88; v.z *= 0.88;
      if (!s.floorHits) s.floorT = s.t;
      s.floorHits++;
    }
  }

  // Coming down through the rim.
  dx = p.x; dz = p.z - H.rimZ; hd = Math.hypot(dx, dz);
  if (prevY >= H.rimY && p.y < H.rimY && v.y < 0) {
    if (!s.cross) s.cross = { x: dx, z: dz };
    if (!s.made && hd < H.rimR) { s.made = true; s.madeT = s.t; s.inNet = true; }
  }

  // Net: slows the ball and centres it while it drops through.
  if (s.inNet) {
    if (p.y > H.rimY - H.netLen - R && hd < H.rimR + 0.05) {
      const k = Math.min(1, 7 * dt);
      v.x -= v.x * k + dx * 30 * dt; v.z -= v.z * k + dz * 30 * dt;
      v.y -= v.y * k * 0.55;
      s.w.x *= 1 - 3 * dt;
    } else s.inNet = false;
  }

  s.w.x *= 1 - 0.15 * dt;

  if (!s.done) {
    const settled =
      (s.made && s.t > s.madeT + 1.0) ||
      (!s.made && s.floorHits > 0 && s.t > s.floorT + 0.6) ||
      s.t > 6;
    if (settled) { s.done = true; s.result = classify(s); }
  }
  return s;
}

// Result labels. `kind` is stable for code; `label` is what the player sees.
export function classify(s) {
  const rimN = s.rim.length, boardN = s.board.length;
  const maxImp = s.rim.reduce((m, e) => Math.max(m, e.imp), 0);
  if (s.made) {
    if (!rimN && !boardN) return { made: true, kind: "swish", label: "Swish!" };
    if (!rimN) return { made: true, kind: "bank", label: "Off the glass — good!" };
    if (rimN === 1 && maxImp < 1.6 && !boardN) return { made: true, kind: "clean", label: "Clean make" };
    return { made: true, kind: "rimIn", label: "Rattled in" };
  }
  const boardFirst = boardN && (!rimN || s.board[0].t < s.rim[0].t);
  if (boardFirst) return { made: false, kind: "board", label: "Off the backboard" };
  if (rimN) {
    const side = s.rim[0].side;
    const label = { front: "Front rim", back: "Back rim", left: "Off the left rim", right: "Off the right rim" }[side];
    return { made: false, kind: side + "Rim", label };
  }
  const c = s.cross;
  if (c && Math.abs(c.x) > Math.abs(c.z)) {
    return { made: false, kind: c.x < 0 ? "wideLeft" : "wideRight", label: c.x < 0 ? "Wide left" : "Wide right" };
  }
  return { made: false, kind: "airball", label: "Airball" };
}

// Run a whole shot (used by tests).
export function simulate(pos, vel, spin, g = 9.81) {
  const s = createShot(pos, vel, spin);
  while (!s.done) step(s, STEP, g);
  return s;
}
