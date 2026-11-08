// Run with: node game/tests/sweep.mjs [forgiveness]
// Prints what happens across a grid of flick errors, and checks the basics.
import { simulate } from "../js/physics.js";
import { launch, DEFAULTS } from "../js/shot.js";
import { RELEASE } from "../js/config.js";

const f = process.argv[2] !== undefined ? Number(process.argv[2]) : DEFAULTS.forgiveness;
const set = { ...DEFAULTS, forgiveness: f };
const code = { swish: "S", clean: "c", bank: "b", rimIn: "r", frontRim: "F", backRim: "B", leftRim: "<", rightRim: ">", board: "|", wideLeft: "L", wideRight: "R", airball: "A" };

function shoot(power, aimDeg) {
  const l = launch({ power, aim: aimDeg * Math.PI / 180 }, RELEASE, set);
  return simulate(RELEASE, l.vel, l.spin, set.gravity).result;
}

const powers = [0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.4];
const aims = [-30, -20, -15, -10, -6, -3, 0, 3, 6, 10, 15, 20, 30];
console.log(`forgiveness ${f}   rows = power (1.00 is perfect), columns = aim in degrees`);
console.log("       " + aims.map(a => String(a).padStart(4)).join(""));
let made = 0, total = 0;
const tally = {};
for (const p of powers) {
  let row = p.toFixed(2).padStart(6) + " ";
  for (const a of aims) {
    const r = shoot(p, a);
    row += code[r.kind].padStart(4);
    total++; if (r.made) made++;
    tally[r.kind] = (tally[r.kind] || 0) + 1;
  }
  console.log(row);
}
console.log("S swish  c clean  b bank  r rattled in | F front  B back  < > side rim  | board  L/R wide  A airball");
console.log(`made ${made}/${total}`, tally);

const fail = [];
if (shoot(1, 0).kind !== "swish") fail.push("perfect flick should swish");
if (shoot(1.04, 3).made !== true) fail.push("near-perfect flick should go in");
if (shoot(0.6, 0).made) fail.push("very weak flick should miss");
if (shoot(1.4, 0).made) fail.push("very strong flick should miss");
if (shoot(1, 30).made) fail.push("30 degrees off should miss");
if (fail.length) { console.error("FAIL:", fail.join("; ")); process.exit(1); }
console.log("checks passed");
