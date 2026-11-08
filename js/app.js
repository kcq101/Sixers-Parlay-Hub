// Sixers Parlay Hub — reads data/*.json and renders four tabs: Tonight, Build, Tickets, Stats.
// Every team: [nickname, primary color, trim color]. Badges are original basketballs in team colors, not league logos.
const TEAMS = {
  ATL: ["Hawks", "#C8102E", "#FDB927"], BOS: ["Celtics", "#007A33", "#BA9653"], BKN: ["Nets", "#111111", "#FFFFFF"],
  CHA: ["Hornets", "#1D1160", "#00788C"], CHI: ["Bulls", "#CE1141", "#111111"], CLE: ["Cavaliers", "#860038", "#FDBB30"],
  DAL: ["Mavericks", "#00538C", "#B8C4CA"], DEN: ["Nuggets", "#0E2240", "#FEC524"], DET: ["Pistons", "#C8102E", "#1D42BA"],
  GSW: ["Warriors", "#1D428A", "#FFC72C"], HOU: ["Rockets", "#CE1141", "#C4CED4"], IND: ["Pacers", "#002D62", "#FDBB30"],
  LAC: ["Clippers", "#C8102E", "#1D428A"], LAL: ["Lakers", "#552583", "#FDB927"], MEM: ["Grizzlies", "#5D76A9", "#12173F"],
  MIA: ["Heat", "#98002E", "#F9A01B"], MIL: ["Bucks", "#00471B", "#EEE1C6"], MIN: ["Timberwolves", "#0C2340", "#78BE20"],
  NOP: ["Pelicans", "#0C2340", "#C8102E"], NYK: ["Knicks", "#006BB6", "#F58426"], OKC: ["Thunder", "#007AC1", "#EF3B24"],
  ORL: ["Magic", "#0077C0", "#C4CED4"], PHI: ["76ers", "#006BB6", "#ED174C"], PHX: ["Suns", "#1D1160", "#E56020"],
  POR: ["Trail Blazers", "#E03A3E", "#111111"], SAC: ["Kings", "#5A2D81", "#63727A"], SAS: ["Spurs", "#111111", "#C4CED4"],
  TOR: ["Raptors", "#CE1141", "#111111"], UTA: ["Jazz", "#002B5C", "#F9A01B"], WAS: ["Wizards", "#002B5C", "#E31837"]
};
const TEAM = Object.fromEntries(Object.entries(TEAMS).map(([k, v]) => [k, v[0]]));

// Original basketball badge in a team's colors with its three-letter code.
// Line-sketch city skylines drawn behind each team's badge. Each city is a left-to-right list of
// [shape, width, height]; shapes are simple building silhouettes, not exact architecture.
const SKYLINES = {
  ATL: [["flat", 8, 40], ["pyramid", 9, 75], ["step", 10, 60], ["spire", 8, 88], ["flat", 10, 50], ["dome", 12, 28]],
  BOS: [["flat", 9, 45], ["antennas", 10, 72], ["flat", 12, 86], ["clock", 7, 56], ["flat", 9, 40]],
  BKN: [["flat", 9, 40], ["clock", 8, 72], ["flat", 12, 55], ["dome", 14, 26], ["flat", 8, 45]],
  CHA: [["flat", 8, 45], ["spire", 10, 95], ["step", 10, 65], ["flat", 9, 55], ["pyramid", 8, 60]],
  CHI: [["flat", 8, 45], ["stepant", 14, 90], ["flat", 8, 55], ["taperant", 10, 80], ["spire", 7, 72], ["flat", 9, 48]],
  CLE: [["flat", 9, 45], ["stepspire", 10, 74], ["taper", 10, 82], ["flat", 10, 55], ["flat", 8, 40]],
  DAL: [["flat", 9, 50], ["tower", 8, 72], ["flat", 11, 80], ["spire", 9, 74], ["flat", 9, 55]],
  DEN: [["flat", 9, 50], ["taper", 10, 72], ["dome", 9, 36], ["dome", 12, 62], ["flat", 8, 45]],
  DET: [["flat", 9, 45], ["flat", 8, 60], ["flat", 12, 88], ["flat", 8, 60], ["stepspire", 9, 70], ["flat", 8, 45]],
  GSW: [["flat", 9, 45], ["pyramid", 9, 95], ["flat", 10, 70], ["taper", 10, 90], ["tower", 7, 58]],
  HOU: [["flat", 9, 55], ["step", 10, 85], ["pyramid", 10, 70], ["flat", 12, 95], ["spire", 9, 75]],
  IND: [["flat", 9, 45], ["spire", 6, 60], ["flat", 11, 75], ["pyramid", 10, 62], ["flat", 9, 50]],
  LAC: [["flat", 9, 50], ["spire", 12, 95], ["flat", 11, 85], ["pyramid", 9, 60], ["flat", 9, 45]],
  LAL: [["flat", 9, 50], ["spire", 12, 95], ["flat", 11, 85], ["pyramid", 9, 60], ["flat", 9, 45]],
  MEM: [["flat", 9, 40], ["pyramid", 16, 55], ["flat", 10, 60], ["step", 9, 50], ["flat", 8, 40]],
  MIA: [["flat", 9, 55], ["step", 10, 70], ["flat", 8, 80], ["taper", 10, 86], ["flat", 9, 60], ["spire", 8, 50]],
  MIL: [["flat", 9, 45], ["clock", 8, 72], ["flat", 11, 76], ["taper", 9, 60], ["flat", 10, 40]],
  MIN: [["flat", 9, 50], ["step", 11, 90], ["pyramid", 9, 70], ["spire", 7, 60], ["flat", 10, 55]],
  NOP: [["flat", 9, 50], ["dome", 16, 40], ["flat", 10, 70], ["pyramid", 9, 60], ["flat", 9, 45]],
  NYK: [["flat", 8, 50], ["stepspire", 10, 88], ["spire", 8, 76], ["flat", 9, 60], ["taperspire", 11, 100], ["flat", 8, 55]],
  OKC: [["flat", 9, 45], ["taper", 12, 90], ["flat", 9, 60], ["step", 9, 55], ["flat", 8, 40]],
  ORL: [["flat", 9, 45], ["spire", 9, 70], ["flat", 10, 60], ["stepspire", 9, 66], ["flat", 8, 40]],
  PHI: [["flat", 8, 40], ["liberty", 10, 74], ["liberty", 8, 60], ["clock", 9, 66], ["taper", 11, 92], ["flat", 10, 100], ["flat", 8, 45]],
  PHX: [["flat", 9, 45], ["flat", 11, 66], ["step", 9, 55], ["dome", 12, 30], ["flat", 8, 40]],
  POR: [["flat", 9, 50], ["pyramid", 9, 70], ["flat", 10, 60], ["stepspire", 9, 72], ["flat", 9, 45]],
  SAC: [["flat", 9, 45], ["clock", 9, 58], ["flat", 11, 70], ["step", 9, 60], ["flat", 9, 40]],
  SAS: [["flat", 9, 45], ["tower", 8, 92], ["flat", 10, 55], ["dome", 9, 34], ["flat", 9, 50]],
  TOR: [["flat", 9, 55], ["tower", 7, 100], ["dome", 14, 34], ["flat", 10, 76], ["flat", 9, 60]],
  UTA: [["flat", 9, 45], ["spire", 8, 70], ["dome", 9, 46], ["flat", 10, 60], ["flat", 8, 40]],
  WAS: [["flat", 9, 30], ["dome", 14, 50], ["spire", 4, 96], ["flat", 10, 30], ["flat", 9, 26]]
};

function building([type, w, h], x) {
  const g = 100, top = g - h, r = x + w, m = x + w / 2;
  const box = (x0, x1, t) => `M${x0} ${g} V${t} H${x1} V${g}`;
  switch (type) {
    case "step": return `${box(x, r, top + h * 0.3)} M${x + w * 0.15} ${top + h * 0.3} V${top + h * 0.12} H${r - w * 0.15} V${top + h * 0.3} M${x + w * 0.32} ${top + h * 0.12} V${top} H${r - w * 0.32} V${top + h * 0.12}`;
    case "stepspire": return `${building(["step", w, h * 0.85], x)} M${m} ${g - h * 0.85} V${top}`;
    case "stepant": return `${box(x, r, top + h * 0.35)} M${x + w * 0.2} ${top + h * 0.35} V${top + h * 0.12} H${r - w * 0.2} V${top + h * 0.35} M${x + w * 0.35} ${top + h * 0.12} V${top} M${r - w * 0.35} ${top + h * 0.12} V${top + h * 0.03}`;
    case "spire": return `${box(x, r, top + h * 0.3)} M${x} ${top + h * 0.3} L${m} ${top + h * 0.1} L${r} ${top + h * 0.3} M${m} ${top + h * 0.1} V${top}`;
    case "liberty": return `${box(x, r, top + h * 0.32)} M${x} ${top + h * 0.32} L${m} ${top + h * 0.12} L${r} ${top + h * 0.32} M${x + w * 0.25} ${top + h * 0.32} L${m} ${top + h * 0.12} L${r - w * 0.25} ${top + h * 0.32} M${m} ${top + h * 0.12} V${top}`;
    case "antennas": return `${box(x, r, top + h * 0.12)} M${x + w * 0.35} ${top + h * 0.12} V${top} M${r - w * 0.35} ${top + h * 0.12} V${top + h * 0.04}`;
    case "taper": return `M${x} ${g} L${x + w * 0.15} ${top} H${r - w * 0.15} L${r} ${g}`;
    case "taperant": return `M${x} ${g} L${x + w * 0.2} ${top + h * 0.12} H${r - w * 0.2} L${r} ${g} M${x + w * 0.35} ${top + h * 0.12} V${top} M${r - w * 0.35} ${top + h * 0.12} V${top}`;
    case "taperspire": return `M${x} ${g} L${x + w * 0.2} ${top + h * 0.2} H${r - w * 0.2} L${r} ${g} M${m} ${top + h * 0.2} V${top}`;
    case "pyramid": return `${box(x, r, top + h * 0.3)} M${x} ${top + h * 0.3} L${m} ${top} L${r} ${top + h * 0.3}`;
    case "dome": return `${box(x, r, top + h * 0.45)} M${x} ${top + h * 0.45} Q${m} ${top - h * 0.15} ${r} ${top + h * 0.45}`;
    case "tower": return `M${m - w * 0.12} ${g} V${top + h * 0.28} M${m + w * 0.12} ${g} V${top + h * 0.28} M${x} ${top + h * 0.28} H${r} L${r - w * 0.15} ${top + h * 0.18} H${x + w * 0.15} Z M${m} ${top + h * 0.18} V${top}`;
    case "clock": return `${box(x + w * 0.15, r - w * 0.15, top + h * 0.35)} M${x} ${g} V${g - h * 0.4} H${x + w * 0.15} M${r} ${g} V${g - h * 0.4} H${r - w * 0.15} M${x + w * 0.15} ${top + h * 0.35} Q${m} ${top + h * 0.12} ${r - w * 0.15} ${top + h * 0.35} M${m} ${top + h * 0.18} V${top} M${m - 1.2} ${top + h * 0.5} a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0`;
    default: return box(x, r, top);
  }
}

// Short window ticks on taller buildings give the sketch some texture.
function windows([type, w, h], x) {
  if (h < 50 || type === "tower") return "";
  let d = "";
  for (let y = 100 - 8; y > 100 - h * 0.6; y -= 8) d += `M${x + w * 0.3} ${y} h${w * 0.4}`;
  return d;
}

// Home city's landmarks in the middle, with lower filler buildings out to both edges.
function skyline(code) {
  const spec = SKYLINES[code];
  if (!spec) return "";
  const W = 360;
  let seed = [...code].reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const filler = n => Array.from({ length: n }, () => [rand() < 0.25 ? "step" : rand() < 0.15 ? "antennas" : "flat", 7 + Math.round(rand() * 6), 22 + Math.round(rand() * 26)]);
  const coreW = spec.reduce((a, b) => a + b[1] + 2, 0);
  const side = (W - coreW) / 2;
  const fill = [];
  let left = [];
  for (let w = 0; w < side - 4;) { const b = filler(1)[0]; left.push(b); w += b[1] + 2; }
  let right = [];
  for (let w = 0; w < side - 4;) { const b = filler(1)[0]; right.push(b); w += b[1] + 2; }
  fill.push(...left, ...spec, ...right);
  const total = fill.reduce((a, b) => a + b[1] + 2, 0);
  let x = (W - total) / 2 + 1, outline = "", ticks = "";
  fill.forEach(b => { outline += building(b, x); ticks += windows(b, x); x += b[1] + 2; });
  return `<svg class="skyline" viewBox="0 0 ${W} 101" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <g fill="none" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round">
      <path d="${outline}" stroke-width="1.2" vector-effect="non-scaling-stroke"/>
      <path d="${outline}" stroke-width="0.8" stroke-opacity=".45" transform="translate(.7 -.5)" vector-effect="non-scaling-stroke"/>
      <path d="${ticks}" stroke-width="0.8" stroke-opacity=".55" vector-effect="non-scaling-stroke"/>
      <path d="M0 100 H${W}" stroke-width="1" vector-effect="non-scaling-stroke"/>
    </g>
  </svg>`;
}

function crest(code) {
  const [, main, trim] = TEAMS[code] || [code, "#34476B", "#8FA2C0"];
  const id = `cr-${esc(code)}`;
  const seam = code === "PHI" ? "#FFFFFF" : trim;
  return `<svg class="crest" viewBox="0 0 84 84" role="img" aria-label="${esc(TEAM[code] || code)}">
    <defs>
      <radialGradient id="${id}-s" cx=".32" cy=".26" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
      <pattern id="${id}-p" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".7" fill="#000" fill-opacity=".18"/><circle cx="3" cy="3" r=".6" fill="#fff" fill-opacity=".07"/></pattern>
      <clipPath id="${id}-c"><circle cx="42" cy="42" r="36"/></clipPath>
    </defs>
    <circle cx="42" cy="42" r="40" fill="${trim}" stroke="rgba(234,240,248,.85)" stroke-width="1.5"/>
    <circle cx="42" cy="42" r="36" fill="${main}"/>
    <circle cx="42" cy="42" r="36" fill="url(#${id}-p)"/>
    <g clip-path="url(#${id}-c)" fill="none" stroke="${seam}" stroke-width="2.6" stroke-opacity=".85">
      <path d="M42 4 V80"/><path d="M4 42 H80"/>
      <path d="M16 12 C30 26 30 58 16 72"/><path d="M68 12 C54 26 54 58 68 72"/>
    </g>
    <circle cx="42" cy="42" r="36" fill="url(#${id}-s)"/>
    <text x="42" y="51" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" font-size="25" textLength="48" lengthAdjust="spacingAndGlyphs" fill="#FFFFFF" stroke="rgba(0,0,0,.55)" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round">${esc(code)}</text>
  </svg>`;
}
const STAT = {
  tpm: n => `${n}+ threes`, stl: n => `${n}+ ${n === 1 ? "steal" : "steals"}`, blk: n => `${n}+ ${n === 1 ? "block" : "blocks"}`,
  reb: n => `${n}+ rebounds`, ast: n => `${n}+ assists`, pts: n => `${n}+ points`, pra: n => `${n}+ pts + reb + ast`,
  ml: () => "moneyline", spread: n => `${n > 0 ? "+" : ""}${n} spread`
};
const STAT_GROUP = { tpm: "Threes", stl: "Steals", blk: "Blocks", reb: "Rebounds", ast: "Assists", pts: "Points", pra: "Pts + reb + ast", ml: "Moneyline", spread: "Spread" };
const SGP_HAIRCUT = 0.85; // FanDuel paid ~15% under the straight multiply on Nov 6
const STAKE = 10;         // illustrative stake; stakes aren't recorded

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtOdds = n => (n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`);
const money = n => `${n < 0 ? "−" : ""}$${Math.abs(n) % 1 ? Math.abs(n).toFixed(2) : Math.abs(n)}`;
const shortName = p => (p === "76ers" ? "76ers" : p.split(" ").slice(-1)[0]);
const initials = p => (p === "76ers" ? "PHI" : p.split(" ").map(w => w[0]).join(""));
const legLabel = l => STAT[l.stat](l.line);
const isGame = l => l.stat === "ml" || l.stat === "spread";
const fmtDate = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtShort = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
const margin = v => (v > 0 ? `won by ${v}` : `lost by ${-v}`);
const pct = (h, n) => (n ? Math.round((h / n) * 100) : 0);

const toProb = a => (a < 0 ? -a / (-a + 100) : 100 / (a + 100));
const toAmerican = dec => (dec >= 2 ? (dec - 1) * 100 : -100 / (dec - 1));

const CHEV = `<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;

function value(game, stat) {
  if (stat === "pra") return game.pts + game.reb + game.ast;
  return game[stat];
}

// Season games for a leg: returns [{date, opp, val, hit}]
function history(leg, data) {
  if (isGame(leg)) {
    return data.players.games.map(g => {
      const [a, b] = g.result.slice(2).split("-").map(Number);
      const m = g.result.startsWith("W") ? a - b : -(b - a);
      const hit = leg.stat === "ml" ? m > 0 : m + leg.line > 0;
      return { date: g.date, opp: g.opp, val: m, hit };
    });
  }
  const log = data.players.players[leg.player] || [];
  return log.map(g => {
    const meta = data.players.games.find(x => x.date === g.date) || {};
    const v = value(g, leg.stat);
    return { date: g.date, opp: meta.opp, val: v, hit: v >= leg.line };
  });
}

// Season average for a leg's stat (Sixers' average margin for game lines), e.g. "2.6" or "+5.2"
function seasonAvg(games, leg) {
  if (!games.length) return "";
  const a = games.reduce((s, g) => s + g.val, 0) / games.length;
  return isGame(leg) ? `${a > 0 ? "+" : ""}${a.toFixed(1)}` : a.toFixed(1);
}
const AVG_WHAT = { tpm: "threes", stl: "steals", blk: "blocks", reb: "rebounds", ast: "assists", pts: "points", pra: "pts + reb + ast", ml: "margin", spread: "margin" };

// How a player + stat has done on our slips: {h, n}
function slipRecord(data, player, stat) {
  const legs = data.slips.slips.flatMap(s => s.legs).filter(l => l.player === player && l.stat === stat);
  return { h: legs.filter(l => l.hit).length, n: legs.length };
}

function legState(l) {
  if (l.void) return "void";
  if (l.actual == null) return "pending";
  return l.hit ? "hit" : "miss";
}

function bars(games, leg) {
  if (!games.length) return `<p class="bars-empty">No game log yet</p>`;
  const vals = games.map(g => Math.abs(g.val));
  const max = Math.max(...vals, isGame(leg) ? 1 : leg.line * 1.6, 1);
  const hits = games.filter(g => g.hit).length;
  const thr = isGame(leg) ? "" : `<span class="thr" style="bottom:${Math.round((leg.line / max) * 34)}px"></span>`;
  return `<div class="bars" role="img" aria-label="Hit in ${hits} of ${games.length} games this season">${games.map(g =>
    `<span class="${g.hit ? "h" : "m"}" style="height:${Math.max(8, Math.round((Math.abs(g.val) / max) * 100))}%" title="${esc(fmtDate(g.date))} vs ${esc(g.opp)}: ${esc(g.val)}"></span>`).join("")}${thr}</div>`;
}

function tagBadge(tag) {
  if (!tag) return "";
  const cls = { Core: "chalk", Solid: "steel", Risky: "red" }[tag] || "steel";
  return `<span class="badge ${cls}">${esc(tag)}</span>`;
}

function expandSlips(t) {
  return t.slips.map(s => (s.sameAs ? { ...s, legs: [...t.slips.find(x => x.name === s.sameAs).legs, ...s.addLegs] } : s));
}

function estPrice(legs) {
  const dec = legs.reduce((acc, l) => acc / toProb(l.price), 1);
  return toAmerican(dec * SGP_HAIRCUT);
}

// ---------- Tonight ----------
function renderTonight(data, el, ui) {
  const t = data.tonight;
  const g = t.game;
  const slips = expandSlips(t);
  const opp = TEAM[g.opp] || g.opp;

  const draw = () => {
    const s = slips[ui.slip] || slips[0];
    const real = s.fdPrice != null;        // FanDuel's actual price, once the slip is placed
    const est = real ? s.fdPrice : estPrice(s.legs);
    const profit = (STAKE * est) / 100;   // regular (unboosted) price
    const states = s.legs.map(legState);
    const settled = states.filter(x => x !== "pending").length;
    const flags = buildFlags(data, s.legs).length;

    el.innerHTML = `
      <section class="plate">
        <span class="stripe"></span><span class="rivet tl"></span><span class="rivet tr"></span><span class="rivet bl"></span><span class="rivet br"></span>
        <div class="plate-top">
          <span class="mono kicker">${esc(new Date(g.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }))} · ${esc(g.tip)}</span>
          <span class="badge ${t.status === "draft" ? "brass" : t.status === "graded" ? "chalk" : "blue"}">${esc({ draft: "Draft", final: "Final picks", graded: "Graded" }[t.status] || t.status)}</span>
        </div>
        <div class="matchup">${skyline(g.home ? "PHI" : g.opp)}
          <div class="team">${crest("PHI")}<span class="team-name">76ers</span><span class="record mono">${esc(g.records.PHI)}</span></div>
          <span class="at">${g.home ? "vs" : "at"}</span>
          <div class="team">${crest(g.opp)}<span class="team-name">${esc(opp)}</span><span class="record mono">${esc(g.records[g.opp])}</span></div>
        </div>
        <div class="plate-foot"><span>${esc(g.venue)}</span><span>${t.status === "draft" ? "Picks not locked" : ""}</span></div>
        ${t.statusNote ? `<p class="status-note">${esc(t.statusNote)}</p>` : ""}
      </section>

      <div class="switch" role="group" aria-label="Slip version">
        ${slips.map((x, i) => `<button type="button" aria-pressed="${i === ui.slip}" data-i="${i}">${esc(x.name)} <small>${x.legs.length}</small></button>`).join("")}
      </div>

      <section class="plate">
        <div class="sum-top">
          <div><div class="label">${real ? "FanDuel price" : "Est. FanDuel price"}</div><div class="big-price">${fmtOdds(est)}</div></div>
          <div class="boosts">${[0.25, 0.5].map(b => `<div class="boost-row"><span class="label">With ${b * 100}% boost</span><span class="boost-price">${fmtOdds(est * (1 + b))}</span></div>`).join("")}</div>
        </div>
        <div class="sum-grid">
          <div><span class="label">Stake</span><b>${money(STAKE)}</b></div>
          <div><span class="label">Profit</span><b class="profit">${money(Math.round(profit * 100) / 100)}</b></div>
          <div><span class="label">Return</span><b>${money(Math.round((STAKE + profit) * 100) / 100)}</b></div>
        </div>
        <p class="muted" style="margin-top:8px">Illustrative $10 stake. Profit is at the regular price, no boost; return = stake + profit.</p>
        <div class="progress-row"><span class="label">Ticket progress</span><span class="label" style="color:var(--ink-2)">${settled} of ${s.legs.length} settled</span></div>
        <div class="segs" aria-hidden="true">${states.map(x => `<span class="seg ${x === "hit" ? "hit" : x === "miss" ? "miss" : ""}"></span>`).join("")}</div>
        <p class="muted" style="margin-top:10px">${real ? "Price from your FanDuel slip." : "Estimate = legs multiplied, less ~15% because FanDuel pays less when legs are related. Your screenshot is the real number."}</p>
      </section>

      <section class="legs">
        <div class="section-row"><h2 class="section">Legs</h2><span class="label">Bars = this season · line = threshold</span></div>
        ${s.legs.map((l, i) => legCard(l, data, g.opp, i === ui.open)).join("")}
      </section>

      <button type="button" class="analyst-link" data-go="t-build">
        <div class="analyst-head"><img class="ai-avatar" src="assets/answers-icon.png" width="32" height="32" alt=""><span class="mono analyst-title">AI: The Answers</span><span class="badge brass" style="margin-left:auto">${flags} ${flags === 1 ? "flag" : "flags"}</span></div>
        ${flagSummary(data, s.legs)}
        <span class="mono" style="display:inline-block;margin-top:10px;font-size:14px">Open the read →</span>
      </button>

      ${scheduleBlock(data.schedule)}

      <section class="panel">
        <h2 class="panel-h">Injury report</h2>
        <div class="rows">${t.injuries.map(i => `<div><span class="mono tm">${esc(i.team)}</span><span class="grow"><b style="font-weight:600">${esc(i.player)}</b> <span class="sub">· ${esc(i.note)}</span></span>${injuryBadge(i.status)}</div>`).join("")}</div>
      </section>

      <section class="panel">
        <h2 class="panel-h">Game notes</h2>
        <div class="rows"><div><span class="grow" style="color:var(--ink-2)">${esc(g.line)}</span></div><div><span class="grow" style="color:var(--ink-2)">${esc(g.lastMeeting)}</span></div></div>
      </section>
    `;
    el.querySelectorAll(".switch button").forEach(b => b.addEventListener("click", () => { ui.slip = +b.dataset.i; draw(); }));
    el.querySelectorAll("details.leg").forEach((d, i) => d.addEventListener("toggle", () => { if (d.open) ui.open = i; else if (ui.open === i) ui.open = -1; }));
  };
  draw();
}

function injuryBadge(status) {
  const s = String(status).toLowerCase();
  const cls = s === "out" ? "red" : s.includes("game-time") || s.includes("questionable") || s.includes("doubtful") ? "blue" : "brass";
  const label = s.includes("game-time") ? "GTD" : s === "no designation" ? "No desig." : status;
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

function legCard(l, data, opp, open) {
  const games = history(l, data);
  const st = legState(l);
  const hits = games.filter(g => g.hit).length;
  const prior = games.filter(x => x.opp === opp);
  const rec = slipRecord(data, l.player, l.stat);
  const vsLine = prior.length ? `vs ${esc(TEAM[opp] || opp)} this season: ${prior.map(x => (isGame(l) ? margin(x.val) : x.val)).join(", ")}` : "";
  const final = l.actual != null
    ? `<p class="final-line ${l.hit ? "hit" : "miss"}">Final: ${esc(isGame(l) ? margin(l.actual) : l.actual)}. ${l.hit ? "Hit" : "Missed"}.</p>` : "";
  return `<details class="leg ${st}"${open ? " open" : ""}>
    <summary>
      <div class="leg-head">
        <span class="ini">${esc(initials(l.player))}</span>
        <span class="leg-mid">
          <span class="leg-name">${esc(shortName(l.player))} ${tagBadge(l.tag)}</span>
          <span class="leg-what">${esc(legLabel(l))}</span>
        </span>
        <span class="leg-right">
          <span class="leg-price">${fmtOdds(l.price)}</span>
          <span class="leg-rate mono">${games.length ? `${hits}/${games.length}<br>avg ${seasonAvg(games, l)}` : "no log"}</span>
        </span>
        ${CHEV}
      </div>
      ${bars(games, l)}
    </summary>
    <div class="leg-body">
      ${final}
      ${games.length ? `<div class="games">${games.map(x => `<div class="${x.hit ? "h" : "m"}"><small>${esc(x.opp)}</small><b>${esc(isGame(l) ? (x.val > 0 ? `W+${x.val}` : `L${x.val}`) : x.val)}</b></div>`).join("")}</div>` : ""}
      ${l.note ? `<p class="leg-note">${esc(l.note)}</p>` : ""}
      <p class="muted">${games.length ? `Season avg ${seasonAvg(games, l)} ${AVG_WHAT[l.stat]}${isGame(l) ? "" : ` (needs ${l.line})`} over ${games.length} games. ` : ""}${rec.n ? `On our slips: ${rec.h} of ${rec.n}.` : "Not on our slips yet."} ${vsLine ? vsLine + "." : ""} ${l.priceNote ? `Price: ${esc(l.priceNote)}.` : ""}</p>
      <div><button type="button" class="btn" data-go="t-build">Swap options</button></div>
    </div>
  </details>`;
}

function scheduleBlock(sch) {
  if (!sch || !sch.updates?.length) return "";
  const fmt = iso => new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
  return `<section class="panel">
    <h2 class="panel-h">Automatic updates</h2>
    <ul class="sched">${sch.updates.map(u => `<li>
      <span class="what">${esc(u.what)}<span>${esc(u.result || u.detail)}</span></span>
      <span class="side">
        <span class="badge ${u.status === "done" ? "hit" : u.status === "failed" ? "red" : "steel"}">${u.status === "done" ? "Done" : u.status === "failed" ? "Didn't run" : "Sched"}</span>
        <span class="mono when">${esc(fmt(u.when))}</span>
      </span>
    </li>`).join("")}</ul>
    ${sch.note ? `<p class="muted" style="margin-top:8px">${esc(sch.note)}</p>` : ""}
  </section>`;
}

// ---------- Analyst checks (computed from the slip and the playbook's working rules) ----------
function buildFlags(data, legs) {
  const flags = [];
  const props = legs.filter(l => !isGame(l));
  const byPlayer = {};
  props.forEach(l => (byPlayer[l.player] ??= []).push(l));
  Object.entries(byPlayer).filter(([, ls]) => ls.length >= 3).forEach(([p, ls]) => flags.push({
    kind: "Same player", cls: "brass", title: `${ls.length} ${shortName(p)} legs`, chips: ls.map(legLabel),
    text: `One cold or short night can sink all ${ls.length} at once.`
  }));
  const pra = props.filter(l => l.stat === "pra");
  if (pra.length >= 3) flags.push({
    kind: "Game script", cls: "brass", title: `${pra.length} pts + reb + ast legs`,
    chips: pra.map(l => `${shortName(l.player)} ${l.line}+`),
    text: pra.length > 3 ? "Over the cap of about 3. Blowouts sink these together, as on Nov 6." : "At the cap of about 3. Blowouts sink these together — on Nov 6 three of five missed."
  });
  const embiid = props.filter(l => l.player === "Joel Embiid" && l.stat !== "reb");
  if (embiid.length) flags.push({
    kind: "Playbook", cls: "red", title: "Embiid leg outside the rules", chips: embiid.map(legLabel),
    text: "The playbook says skip Embiid threes, blocks and pts + reb + ast. Rebounds is the only one worth testing."
  });
  props.filter(l => l.tag === "Risky" && !embiid.includes(l)).forEach(l => flags.push({
    kind: "Risky leg", cls: "red", title: `${shortName(l.player)} ${legLabel(l)}`, chips: [], text: l.note || ""
  }));
  return flags;
}

// Each warning with the legs behind it spelled out, as list items.
function watchList(flags) {
  return `<ul class="watch">${flags.map(f => `<li><b>${esc(f.title)}</b>${f.chips.length ? `<span>${f.chips.map(esc).join(" · ")}</span>` : ""}</li>`).join("")}</ul>`;
}
function flagSummary(data, legs) {
  const f = buildFlags(data, legs);
  if (!f.length) return `<p style="font-size:15px;color:var(--ink-2)">No overlaps or rule breaks found in this slip.</p>`;
  return watchList(f);
}

// ---------- Build ----------
function renderBuild(data, el, ui) {
  const t = data.tonight;
  const slips = expandSlips(t);
  const draw = () => {
    const s = slips[ui.slip] || slips[0];
    const flags = buildFlags(data, s.legs);
    const risky = s.legs.filter(l => l.tag === "Risky");
    const why = s.legs.map(l => {
      const games = history(l, data);
      const h = games.filter(x => x.hit).length;
      return { l, h, n: games.length, r: games.length ? h / games.length : 0, avg: seasonAvg(games, l) };
    }).sort((a, b) => b.r - a.r || b.n - a.n);
    const strong = why.filter(w => w.n && w.r >= 0.8).length;
    const target = risky[0] || why[why.length - 1].l;
    const injuries = t.injuries.filter(i => i.team === "PHI" ? true : !/out/i.test(i.status));
    const est = s.fdPrice != null ? s.fdPrice : estPrice(s.legs);

    el.innerHTML = `
      <section class="analyst">
        <div style="display:flex;align-items:center;gap:10px">
          <img class="ai-avatar lg" src="assets/answers-icon.png" width="44" height="44" alt="">
          <div style="display:flex;flex-direction:column;gap:3px"><span class="mono analyst-title" style="color:var(--blue-ink);font-size:15px">AI: The Answers</span><span class="mono" style="font-size:11px;color:var(--ink-4)">${esc(s.name)} · ${s.legs.length} legs</span></div>
        </div>
        <p class="lead">${strong} of ${s.legs.length} legs hit in at least 80% of games this season.${flags.length ? " Watch:" : " No overlaps or rule breaks found."}</p>
        ${flags.length ? watchList(flags) : ""}
        <div class="mini-kpis">
          <div><b>${fmtOdds(est)}</b><span class="label">Est. price</span></div>
          <div><b class="brass-t">${flags.filter(f => f.cls === "brass").length}</b><span class="label">Overlaps</span></div>
          <div><b style="color:var(--red-ink)">${risky.length}</b><span class="label">Risky ${risky.length === 1 ? "leg" : "legs"}</span></div>
        </div>
      </section>

      ${flags.length ? `<section class="panel"><h2 class="panel-h">Overlap &amp; correlated risk</h2>
        ${flags.map(f => `<div class="flag"><div class="flag-h"><span class="badge ${f.cls}">${esc(f.kind)}</span>${esc(f.title)}</div>
          ${f.chips.length ? `<div class="chips">${f.chips.map(c => `<span class="chip">${esc(c)}</span>`).join("")}</div>` : ""}
          ${f.text ? `<p>${esc(f.text)}</p>` : ""}</div>`).join("")}
      </section>` : ""}

      <section class="panel">
        <h2 class="panel-h">Injury, lineup &amp; minutes</h2>
        <div class="rows">${injuries.map(i => `<div><span class="mono tm">${esc(i.team)}</span><span class="grow"><b style="font-weight:600">${esc(i.player)}</b> <span class="sub">· ${esc(i.note)}</span></span>${injuryBadge(i.status)}</div>`).join("")}</div>
        <p class="muted" style="margin-top:8px">The 1:30 PM refresh rechecks this and swaps any leg whose player is out.</p>
      </section>

      <section class="panel" style="border-color:rgba(237,23,76,.45)">
        <h2 class="panel-h">Swap one leg</h2>
        <div class="swap-target">
          <span style="flex:1;display:flex;flex-direction:column;gap:2px"><span class="mono" style="font-size:11px;color:#FF8FA8">${target.tag === "Risky" ? "Riskiest leg" : "Weakest leg"}</span><span class="disp" style="font-size:19px;font-weight:700">${esc(shortName(target.player))} ${esc(legLabel(target))} <span style="color:var(--ink-3);font-weight:500">${fmtOdds(target.price)}</span></span></span>
          ${tagBadge(target.tag)}
        </div>
        <p class="muted" style="margin:8px 0 12px">Bench options keep the other legs as they are. Make the swap in FanDuel; this page never places a bet.</p>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${t.bench.map(b => {
            const games = history(b, data);
            const h = games.filter(x => x.hit).length;
            return `<div class="swap-opt"><div style="display:flex;justify-content:space-between;gap:8px"><span class="disp" style="font-size:18px;font-weight:700">${esc(shortName(b.player))} ${esc(legLabel(b))}</span><span class="mono" style="font-size:12.5px;color:var(--brass-ink);white-space:nowrap">${games.length ? `${h}/${games.length} · avg ${seasonAvg(games, b)}` : ""}</span></div>
              ${bars(games, b)}
              <p class="muted" style="font-size:13px;color:var(--ink-3)">${esc(b.effect)} ${esc(b.note || "")}</p></div>`;
          }).join("")}
        </div>
      </section>

      <section class="panel why">
        <h2 class="panel-h">Why each leg</h2>
        ${why.map(w => `<div><span class="mono rate">${w.n ? `${w.h}/${w.n}<br><span style="color:var(--ink-4)">avg ${w.avg}</span>` : "—"}</span><div style="flex:1;display:flex;flex-direction:column;gap:2px"><span class="leg-t">${esc(shortName(w.l.player))} ${esc(legLabel(w.l))}</span><p>${esc(w.l.note || "")}</p></div></div>`).join("")}
      </section>

      ${t.tuner?.length ? `<section class="panel tuner"><h2 class="panel-h">If FanDuel's price is off</h2>${t.tuner.map(x => `<div>${esc(x)}</div>`).join("")}</section>` : ""}

      <p class="disclaimer">Rates are how often each leg would have hit this season, not the chance it hits tonight. The analyst's notes are a read of the data, not a guarantee. The FanDuel screenshot is always the real price.</p>

      ${playbookBlock(data.playbook)}
    `;
  };
  draw();
  return draw;
}

function playbookBlock(p) {
  if (!p) return "";
  return `<details class="rules">
    <summary>House rules &amp; lessons ${CHEV}</summary>
    <div class="rules-body">
      <div><h3 class="panel-h" style="margin-bottom:4px">How we play</h3><ul>${p.houseRules.map(r => `<li>${esc(r)}</li>`).join("")}</ul></div>
      <div><h3 class="panel-h" style="margin-bottom:4px">What the history says</h3><ul>${p.learned.map(r => `<li><b>${esc(r.rule)}</b><span>${esc(r.why)}</span></li>`).join("")}</ul></div>
    </div>
  </details>`;
}

// ---------- Tickets ----------
function ticketPL(s) {
  const won = s.legs.every(l => l.hit);
  const price = s.boosted || s.price;
  return won ? (STAKE * price) / 100 : -STAKE;
}

function renderTickets(data, el) {
  const slips = [...data.slips.slips].sort((a, b) => b.date.localeCompare(a.date));
  const all = slips.flatMap(s => s.legs);
  const hits = all.filter(l => l.hit).length;
  const won = slips.filter(s => s.legs.every(l => l.hit)).length;
  const oneAway = slips.filter(s => s.legs.filter(l => !l.hit).length === 1).length;
  const t = data.tonight;
  const tonightSlips = expandSlips(t);
  let filter = "all";
  const FILTERS = { all: "All", near: "One away", line: "With game line", boosted: "Boosted" };
  const keep = s => filter === "all" ? true
    : filter === "near" ? s.legs.filter(l => !l.hit).length === 1
    : filter === "line" ? s.legs.some(isGame)
    : !!s.boosted;

  const draw = () => {
    el.innerHTML = `
      <section class="plate kpi3">
        <div><b>${won}–${slips.length - won}</b><span class="label">Cashed</span></div>
        <div><b>${hits}/${all.length}</b><span class="label">Legs hit · ${pct(hits, all.length)}%</span></div>
        <div><b class="brass-t">${oneAway}</b><span class="label">One leg away</span></div>
      </section>

      <div class="pills" role="group" aria-label="Filter tickets">
        ${Object.entries(FILTERS).map(([k, v]) => `<button type="button" aria-pressed="${k === filter}" data-f="${k}">${v}</button>`).join("")}
      </div>

      ${t.status !== "graded" ? `<button type="button" class="next-card" data-go="t-tonight">
        <span style="flex:1;display:flex;flex-direction:column;gap:3px">
          <span class="mono" style="font-size:11px;color:var(--brass-ink)">Up next · ${esc({ draft: "Draft", final: "Final picks" }[t.status] || t.status)}</span>
          <span class="disp" style="font-size:20px;font-weight:700">${t.game.home ? "vs" : "at"} ${esc(TEAM[t.game.opp] || t.game.opp)} · ${esc(fmtDate(t.game.date))}</span>
          <span style="font-size:15px;color:var(--ink-3)">${tonightSlips.map(s => `${s.legs.length} legs ${s.fdPrice != null ? fmtOdds(s.fdPrice) : `est. ${fmtOdds(estPrice(s.legs))}`}`).join(" · ")}</span>
        </span>
        <span class="mono" style="font-size:14px">Open →</span>
      </button>` : ""}

      ${slips.filter(keep).map(ticketBlock).join("") || `<p class="muted">No tickets match.</p>`}
      <p class="muted">P/L assumes an illustrative $10 stake per ticket.</p>
    `;
    el.querySelectorAll(".pills button").forEach(b => b.addEventListener("click", () => { filter = b.dataset.f; draw(); }));
  };
  draw();
}

function ticketBlock(s) {
  const h = s.legs.filter(l => l.hit).length;
  const missed = s.legs.length - h;
  const pl = ticketPL(s);
  const cls = missed === 0 ? "won" : missed === 1 ? "near" : "";
  const price = s.boosted ? `${fmtOdds(s.price)} → ${fmtOdds(s.boosted)} boosted` : fmtOdds(s.price);
  const final = s.final.replace(/^W /, "Won ").replace(/^L /, "Lost ").replace("-", "–");
  return `<details class="ticket ${cls}">
    <summary>
      <div class="t-top"><span class="t-title">${s.home ? "vs" : "at"} ${esc(TEAM[s.opp] || s.opp)} · ${esc(fmtDate(s.date))}${s.label ? ` <small>${esc(s.label)}</small>` : ""}</span><span class="t-res">${missed === 0 ? "Cashed" : `${h} of ${s.legs.length}`}</span></div>
      <div class="t-sub"><span>${esc(price)} · ${esc(final)}</span><span class="${pl < 0 ? "pl-neg" : "pl-pos"}">${pl < 0 ? money(pl) : "+" + money(Math.round(pl * 100) / 100)}</span></div>
      <div class="dots" aria-label="${h} of ${s.legs.length} legs hit">${s.legs.map(l => `<span class="dot ${l.hit ? "h" : "m"}"></span>`).join("")}</div>
    </summary>
    <ul class="t-legs">${s.legs.map(l => `<li class="${l.hit ? "h" : "m"}"><span class="dot ${l.hit ? "h" : "m"}" aria-label="${l.hit ? "hit" : "missed"}"></span>${esc(shortName(l.player))} ${esc(legLabel(l))}<span class="act">${l.actual == null ? "" : esc(isGame(l) ? (l.actual > 0 ? `W+${l.actual}` : `L${l.actual}`) : l.actual)}</span></li>`).join("")}
      ${s.note ? `<li><p class="t-note">${esc(s.note)}</p></li>` : ""}
    </ul>
  </details>`;
}

// ---------- Stats ----------
// Ticket color by share of legs hit: 50%+ is green, stronger toward 100%;
// under 50% runs orange to a deep red the further below the middle.
function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function rampColor(r) {
  return r >= 0.5 ? mix("#7FB79A", "#1FD67E", (r - 0.5) / 0.5) : mix("#B5122F", "#F59E3B", r / 0.5);
}

function rateRow(name, h, n) {
  const r = n ? h / n : 0;
  const c = r >= 0.8 ? "var(--hit)" : r >= 0.6 ? "var(--blue)" : "var(--red)";
  return `<div class="rate-row"><div class="top"><span>${esc(name)}</span><span class="mono" style="font-size:14px;color:var(--ink-2)">${h}/${n} · ${pct(h, n)}%</span></div><div class="trk"><i style="width:${pct(h, n)}%;background:${c}"></i></div></div>`;
}

function renderStats(data, el) {
  const slips = [...data.slips.slips].sort((a, b) => a.date.localeCompare(b.date));
  const all = slips.flatMap(s => s.legs);
  const hits = all.filter(l => l.hit).length;
  const pl = slips.reduce((a, s) => a + ticketPL(s), 0);
  const cashed = slips.filter(s => s.legs.every(l => l.hit));
  const best = Math.max(...slips.map(s => s.boosted || s.price));
  const bestSlip = slips.find(s => (s.boosted || s.price) === best);
  const near = slips.filter(s => s.legs.filter(l => !l.hit).length === 1);
  const avgHit = slips.reduce((a, s) => a + s.legs.filter(l => l.hit).length, 0) / slips.length;
  const avgLegs = all.length / slips.length;
  const maxLegs = Math.max(...slips.map(s => s.legs.length));

  const group = keyFn => {
    const g = {};
    all.forEach(l => { const k = keyFn(l); g[k] ??= { h: 0, n: 0 }; g[k].n++; if (l.hit) g[k].h++; });
    return Object.entries(g).sort((a, b) => b[1].h / b[1].n - a[1].h / a[1].n || b[1].n - a[1].n);
  };
  const byPlayer = group(l => (l.player === "76ers" ? "Sixers game lines" : shortName(l.player)));
  const byCat = group(l => (isGame(l) ? "Game lines" : STAT_GROUP[l.stat]));

  let sortKey = "rate";
  let filter = "All";
  const players = ["All", ...new Set(all.map(l => l.player))];

  const draw = () => {
    const legs = filter === "All" ? all : all.filter(l => l.player === filter);
    const groups = {};
    legs.forEach(l => {
      const key = `${l.player}|${l.stat}`;
      groups[key] ??= { player: l.player, stat: l.stat, n: 0, h: 0 };
      groups[key].n++; if (l.hit) groups[key].h++;
    });
    const rows = Object.values(groups).sort((a, b) =>
      sortKey === "rate" ? (b.h / b.n - a.h / a.n) || b.n - a.n : b.n - a.n || (b.h / b.n - a.h / a.n));

    el.innerHTML = `
      <section class="plate hero">
        <div><div class="label">Season P/L</div><div class="hero-n" style="color:${pl < 0 ? "var(--red-ink)" : "var(--hit)"}">${pl < 0 ? money(pl) : "+" + money(Math.round(pl))}</div><span class="muted">at $10 a ticket · ${slips.length} played</span></div>
        <div style="text-align:right"><div class="label">Legs hit</div><div class="hero-n" style="font-size:40px">${pct(hits, all.length)}%</div><span class="muted">${hits} of ${all.length}</span></div>
      </section>

      <div class="kpi2">
        <div><span class="label">Highest payout</span><b>${cashed.length ? "+" + money(Math.round(Math.max(...cashed.map(ticketPL)))) : "—"}</b><span class="muted">${cashed.length ? `${cashed.length} cashed` : "None cashed yet"}</span></div>
        <div><span class="label">Best price played</span><b class="brass-t">${fmtOdds(best)}</b><span class="muted">${esc(TEAM[bestSlip.opp] || bestSlip.opp)} ${esc(fmtDate(bestSlip.date))}${bestSlip.label ? " " + esc(bestSlip.label) : ""}</span></div>
        <div><span class="label">Avg legs hit</span><b>${avgHit.toFixed(1)} <small>/ ${avgLegs.toFixed(1)}</small></b><span class="muted">per ticket</span></div>
        <div><span class="label">One leg away</span><b class="brass-t">${near.length}</b><span class="muted">${near.map(s => fmtShort(s.date)).join(", ") || "none"}</span></div>
      </div>

      <section class="panel">
        <h2 class="panel-h">Legs hit per ticket</h2>
        <div class="legend"><span><i class="sw" style="box-shadow:inset 0 0 0 1.5px var(--red)"></i>Missed legs</span><span style="gap:6px"><span class="mono" style="font-size:11px">0%</span><i class="ramp" aria-hidden="true"></i><span class="mono" style="font-size:11px">100% hit</span></span></div>
        <div class="chart" role="img" aria-label="Legs hit per ticket, oldest to newest: ${slips.map(s => `${s.legs.filter(l => l.hit).length} of ${s.legs.length}`).join(", ")}">
          ${slips.map(s => { const h = s.legs.filter(l => l.hit).length; const m = s.legs.length - h;
            return `<div class="col" title="${esc(fmtDate(s.date))}${s.label ? " " + esc(s.label) : ""}: ${h} of ${s.legs.length}"><div class="miss" style="height:${(m / maxLegs) * 100}%"></div><div class="hit" style="height:${(h / maxLegs) * 100}%;background:${rampColor(h / s.legs.length)}"></div></div>`; }).join("")}
        </div>
        <div class="chart-x">${slips.map((s, i) => { const [, m, d] = s.date.split("-").map(Number); const prevM = i ? +slips[i - 1].date.split("-")[1] : 0; return `<span>${m !== prevM ? `${m}/${d}` : d}</span>`; }).join("")}</div>
      </section>

      <section class="panel"><h2 class="panel-h">Hit rate by player</h2>${byPlayer.map(([k, v]) => rateRow(k, v.h, v.n)).join("")}</section>
      <section class="panel"><h2 class="panel-h">Hit rate by prop type</h2>${byCat.map(([k, v]) => rateRow(k, v.h, v.n)).join("")}</section>

      <section class="panel">
        <h2 class="panel-h">Every player + prop</h2>
        <div class="pills" role="group" aria-label="Filter by player" style="margin-bottom:10px">
          ${players.map(p => `<button type="button" aria-pressed="${p === filter}" data-p="${esc(p)}">${esc(p === "All" ? "Everyone" : shortName(p))}</button>`).join("")}
        </div>
        <table class="rates">
          <thead><tr><th scope="col">Leg</th><th scope="col" style="text-align:right"><button type="button" data-sort="count" aria-pressed="${sortKey === "count"}">Played</button></th><th scope="col" style="text-align:right"><button type="button" data-sort="rate" aria-pressed="${sortKey === "rate"}">Hit</button></th></tr></thead>
          <tbody>${rows.map(r => `<tr><td>${esc(shortName(r.player))} ${esc(STAT_GROUP[r.stat].toLowerCase())}<div class="trk" style="margin-top:4px;height:5px"><i style="width:${pct(r.h, r.n)}%;background:${r.h / r.n >= 0.8 ? "var(--hit)" : r.h / r.n >= 0.6 ? "var(--blue)" : "var(--red)"}"></i></div></td><td class="num">${r.n}</td><td class="num">${r.h}/${r.n}</td></tr>`).join("")}</tbody>
        </table>
      </section>
    `;
    el.querySelectorAll(".pills button").forEach(b => b.addEventListener("click", () => { filter = b.dataset.p; draw(); }));
    el.querySelectorAll("th button[data-sort]").forEach(b => b.addEventListener("click", () => { sortKey = b.dataset.sort; draw(); }));
  };
  draw();
}

// ---------- Tabs + boot ----------
const OLD_HASH = { history: "tickets", playbook: "build" };
function show(id) {
  document.querySelectorAll('[role="tab"]').forEach(t => {
    const on = t.id === id;
    t.setAttribute("aria-selected", on);
    document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
  });
  try { window.history.replaceState(null, "", "#" + id.slice(2)); } catch (e) { /* file:// */ }
  window.scrollTo(0, 0);
}
function setupTabs() {
  document.querySelectorAll('[role="tab"]').forEach(t => t.addEventListener("click", () => show(t.id)));
  document.addEventListener("click", e => { const go = e.target.closest("[data-go]"); if (go) show(go.dataset.go); });
  let fromHash = location.hash.replace("#", "");
  fromHash = OLD_HASH[fromHash] || fromHash;
  if (fromHash && document.getElementById("t-" + fromHash)) show("t-" + fromHash);
}

const ui = { slip: 0, open: -1 };
async function load() {
  try {
    const bust = `?v=${Date.now()}`;
    const [tonight, slips, players, playbook, schedule] = await Promise.all(
      ["tonight", "slips", "players", "playbook", "schedule"].map(n => fetch(`data/${n}.json${bust}`).then(r => { if (!r.ok) throw new Error(n); return r.json(); })));
    const data = { tonight, slips, players, playbook, schedule };
    $("#updated").textContent = `Updated ${new Date(tonight.updated).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
    if (ui.slip >= tonight.slips.length) ui.slip = 0;
    const redrawBuild = renderBuild(data, $("#tab-build"), ui);
    renderTonight(data, $("#tab-tonight"), ui);
    // Keep Build in step with the slip chosen on Tonight.
    $("#tab-tonight").addEventListener("click", e => { if (e.target.closest(".switch button")) redrawBuild(); });
    renderTickets(data, $("#tab-tickets"));
    renderStats(data, $("#tab-stats"));
  } catch (e) {
    $("#tab-tonight").innerHTML = `<p class="error">Couldn't load the picks file (${esc(e.message)}). Refresh the page; if it keeps happening, the data file in the repo has a formatting error.</p>`;
  }
}

function setupRefresh() {
  const b = $("#refresh");
  b.addEventListener("click", async () => {
    b.classList.remove("spin"); void b.offsetWidth; b.classList.add("spin");
    ["#tab-tonight", "#tab-build", "#tab-tickets", "#tab-stats"].forEach(s => { const el = $(s); el.replaceWith(el.cloneNode(false)); });
    await load();
  });
}

setupTabs();
setupRefresh();
load();
