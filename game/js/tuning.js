// On-screen tuning panel. Settings are saved on the phone so they stick between visits.
import { DEFAULTS } from "./shot.js";

const KEY = "shootAround.tuning.v1";
const SLIDERS = [
  ["forgiveness", "Forgiveness", 0, 1, 0.05, v => v < 0.35 ? "Strict" : v < 0.65 ? "Medium" : "Generous"],
  ["targetSpeed", "Flick speed for a perfect shot", 1, 4, 0.1, v => v.toFixed(1)],
  ["powerSens", "How much speed matters", 0.4, 2, 0.1, v => v.toFixed(1) + "×"],
  ["aimSens", "How much aim matters", 0.4, 2, 0.1, v => v.toFixed(1) + "×"],
  ["launchDeg", "Shot arc", 44, 60, 1, v => v + "°"],
  ["windowMs", "Release window", 40, 200, 10, v => v + " ms"],
  ["backspin", "Backspin", 0, 4, 0.2, v => v.toFixed(1) + " rev/s"],
  ["gravity", "Gravity", 7, 12, 0.1, v => v.toFixed(1)],
];

export function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch (_) { return { ...DEFAULTS }; }
}
function save(set) { try { localStorage.setItem(KEY, JSON.stringify(set)); } catch (_) { /* private mode */ } }

export function mountPanel(root, set, { onDebug }) {
  root.innerHTML = `
    <div class="panel-head"><h2>Tuning</h2><button type="button" class="x" data-close aria-label="Close tuning">✕</button></div>
    ${SLIDERS.map(([k, label, min, max, step]) => `
      <label class="row"><span class="lab">${label}<b data-out="${k}"></b></span>
      <input type="range" min="${min}" max="${max}" step="${step}" data-k="${k}" value="${set[k]}"></label>`).join("")}
    <label class="check"><input type="checkbox" data-debug> Show flick numbers</label>
    <button type="button" class="reset" data-reset>Reset to defaults</button>`;
  const out = k => root.querySelector(`[data-out="${k}"]`);
  const fmt = Object.fromEntries(SLIDERS.map(s => [s[0], s[5]]));
  const paint = () => SLIDERS.forEach(([k]) => { out(k).textContent = fmt[k](set[k]); root.querySelector(`[data-k="${k}"]`).value = set[k]; });
  root.addEventListener("input", e => {
    const k = e.target.dataset.k;
    if (k) { set[k] = Number(e.target.value); paint(); save(set); }
    if (e.target.matches("[data-debug]")) onDebug(e.target.checked);
  });
  root.querySelector("[data-reset]").addEventListener("click", () => { Object.assign(set, DEFAULTS); paint(); save(set); });
  root.querySelector("[data-close]").addEventListener("click", () => { root.hidden = true; });
  paint();
}
