// Sixers Parlay Hub — reads data/*.json and renders three tabs.
const TEAM = { CHI: "Bulls", CLE: "Cavaliers", DET: "Pistons", MIL: "Bucks", IND: "Pacers", NYK: "Knicks", CHA: "Hornets", BOS: "Celtics", TOR: "Raptors", BKN: "Nets", ORL: "Magic", POR: "Trail Blazers", MIA: "Heat", HOU: "Rockets", MEM: "Grizzlies", DEN: "Nuggets" };
const STAT = {
  tpm: n => `${n}+ threes`, stl: n => `${n}+ ${n === 1 ? "steal" : "steals"}`, blk: n => `${n}+ ${n === 1 ? "block" : "blocks"}`,
  reb: n => `${n}+ rebounds`, ast: n => `${n}+ assists`, pts: n => `${n}+ points`, pra: n => `${n}+ pts + reb + ast`,
  ml: () => "moneyline", spread: n => `${n > 0 ? "+" : ""}${n} spread`
};
const STAT_GROUP = { tpm: "Threes", stl: "Steals", blk: "Blocks", reb: "Rebounds", ast: "Assists", pts: "Points", pra: "Pts + reb + ast", ml: "Moneyline", spread: "Spread" };
const SGP_HAIRCUT = 0.85; // FanDuel paid ~15% under the straight multiply on Nov 6

const $ = (sel, el = document) => el.querySelector(sel);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmtOdds = n => (n > 0 ? `+${Math.round(n)}` : `${Math.round(n)}`);
const shortName = p => (p === "76ers" ? "76ers" : p.split(" ").slice(-1)[0]);
const legLabel = l => STAT[l.stat](l.line);
const fmtDate = d => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

const toProb = a => (a < 0 ? -a / (-a + 100) : 100 / (a + 100));
const toAmerican = dec => (dec >= 2 ? (dec - 1) * 100 : -100 / (dec - 1));

function value(game, stat) {
  if (stat === "pra") return game.pts + game.reb + game.ast;
  return game[stat];
}

// Season games for a leg: returns [{date, val, hit}]
function history(leg, data) {
  if (leg.stat === "ml" || leg.stat === "spread") {
    return data.players.games.map(g => {
      const [a, b] = g.result.slice(2).split("-").map(Number);
      const margin = g.result.startsWith("W") ? a - b : -(b - a);
      const hit = leg.stat === "ml" ? margin > 0 : margin + leg.line > 0;
      return { date: g.date, opp: g.opp, val: margin, hit };
    });
  }
  const log = data.players.players[leg.player] || [];
  return log.map(g => {
    const meta = data.players.games.find(x => x.date === g.date) || {};
    const v = value(g, leg.stat);
    return { date: g.date, opp: meta.opp, val: v, hit: v >= leg.line };
  });
}

function strip(games, extraClass = "") {
  if (!games.length) return `<div class="strip ${extraClass}"><span class="strip-count">No game log yet</span></div>`;
  const hits = games.filter(g => g.hit).length;
  const marks = games.map(g => `<span class="mark ${g.hit ? "hit" : "miss"}" title="${esc(fmtDate(g.date))} vs ${esc(g.opp)}: ${esc(g.val)}"></span>`).join("");
  return `<div class="strip ${extraClass}" aria-label="Hit in ${hits} of ${games.length} games">${marks}<span class="strip-count">${hits} of ${games.length} this season</span></div>`;
}

// ---------- Tonight ----------
function renderTonight(data, el) {
  const t = data.tonight;
  const g = t.game;
  const slips = t.slips.map(s => (s.sameAs ? { ...s, legs: [...t.slips.find(x => x.name === s.sameAs).legs, ...s.addLegs] } : s));
  let active = 0;

  const draw = () => {
    const s = slips[active];
    const dec = s.legs.reduce((acc, l) => acc / toProb(l.price), 1);
    const est = toAmerican(dec * SGP_HAIRCUT);
    const boosted50 = est * 1.5;

    el.innerHTML = `
      <h2 class="matchup">76ers <span class="vs">${g.home ? "vs" : "at"}</span> ${esc(TEAM[g.opp] || g.opp)}</h2>
      <p class="when">${esc(new Date(g.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }))}, ${esc(g.tip)}, ${esc(g.venue)}. Records: Sixers ${esc(g.records.PHI)}, ${esc(TEAM[g.opp])} ${esc(g.records[g.opp])}.</p>
      <p class="status ${t.status === "final" ? "final" : ""}">${t.status === "final" ? "Final picks." : "Draft."} ${esc(t.statusNote)}</p>

      <div class="switch" role="group" aria-label="Slip version">
        ${slips.map((x, i) => `<button aria-pressed="${i === active}" data-i="${i}">${esc(x.name)} (${x.legs.length})</button>`).join("")}
      </div>

      <div class="price-block">
        <span class="price">${fmtOdds(est)}</span>
        <span class="price-meta">estimated FanDuel price<br>${fmtOdds(boosted50)} with a 50% boost</span>
      </div>
      <p class="price-note">Built from each leg's price, less about 15% because FanDuel pays less when legs are related. Your screenshot is the real number.</p>

      <ul class="legs">${s.legs.map(l => legRow(l, data, g.opp)).join("")}</ul>

      <h2 class="section">If the price is off</h2>
      <ul class="plain">${t.tuner.map(x => `<li>${esc(x)}</li>`).join("")}</ul>

      <h2 class="section">Bench</h2>
      <ul class="legs">${t.bench.map(b => benchRow(b, data, g.opp)).join("")}</ul>

      <h2 class="section">Injury report</h2>
      <ul class="plain">${t.injuries.map(i => `<li><strong>${esc(i.player)}</strong> (${esc(i.team)}): ${esc(i.status)}. <span>${esc(i.note)}</span></li>`).join("")}</ul>

      <h2 class="section">Game notes</h2>
      <ul class="plain"><li>${esc(g.line)}</li><li>${esc(g.lastMeeting)}</li></ul>
    `;
    el.querySelectorAll(".switch button").forEach(b => b.addEventListener("click", () => { active = +b.dataset.i; draw(); }));
  };
  draw();
}

function vsOpp(games, opp, leg) {
  const prior = games.filter(x => x.opp === opp);
  if (!prior.length || leg.stat === "ml" || leg.stat === "spread") return "";
  return `<p class="vs-opp">vs ${esc(TEAM[opp] || opp)} this season: ${prior.map(x => x.val).join(", ")}</p>`;
}

function legRow(l, data, opp) {
  const games = history(l, data);
  return `<li class="leg">
    <div class="leg-top">
      <div><span class="leg-name">${esc(shortName(l.player))}</span> <span class="leg-what">${esc(legLabel(l))}</span>${l.tag ? `<span class="tag tag-${esc(l.tag)}">${esc(l.tag)}</span>` : ""}</div>
      <div class="leg-price">${fmtOdds(l.price)}<small>${esc(l.priceNote || "")}</small></div>
    </div>
    ${strip(games)}
    ${vsOpp(games, opp, l)}
    ${l.note ? `<p class="leg-note">${esc(l.note)}</p>` : ""}
  </li>`;
}

function benchRow(b, data, opp) {
  const games = history(b, data);
  return `<li class="leg">
    <div class="leg-top"><div><span class="leg-name">${esc(shortName(b.player))}</span> <span class="leg-what">${esc(legLabel(b))}</span></div></div>
    ${strip(games)}
    ${vsOpp(games, opp, b)}
    <p class="leg-note">${esc(b.effect)} ${esc(b.note || "")}</p>
  </li>`;
}

// ---------- History ----------
function renderHistory(data, el) {
  const slips = [...data.slips.slips].sort((a, b) => b.date.localeCompare(a.date));
  const allLegs = slips.flatMap(s => s.legs.map(l => ({ ...l, date: s.date })));
  const hits = allLegs.filter(l => l.hit).length;
  const won = slips.filter(s => s.legs.every(l => l.hit)).length;
  const oneAway = slips.filter(s => s.legs.filter(l => !l.hit).length === 1).length;

  let filter = "All";
  let sortKey = "rate";
  const players = ["All", ...new Set(allLegs.map(l => l.player))];

  const draw = () => {
    const legs = filter === "All" ? allLegs : allLegs.filter(l => l.player === filter);
    const groups = {};
    legs.forEach(l => {
      const key = `${l.player}|${l.stat}`;
      groups[key] ??= { player: l.player, stat: l.stat, n: 0, h: 0 };
      groups[key].n++; if (l.hit) groups[key].h++;
    });
    const rows = Object.values(groups).sort((a, b) =>
      sortKey === "rate" ? (b.h / b.n - a.h / a.n) || b.n - a.n : b.n - a.n || (b.h / b.n - a.h / a.n));

    el.innerHTML = `
      <div class="summary">
        <div><b>${won} of ${slips.length}</b><span>slips cashed</span></div>
        <div><b>${hits} of ${allLegs.length}</b><span>legs hit</span></div>
        <div><b>${oneAway}</b><span>lost by one leg</span></div>
      </div>

      <h2 class="section">Hit rate by leg</h2>
      <div class="filters" role="group" aria-label="Filter by player">
        ${players.map(p => `<button aria-pressed="${p === filter}" data-p="${esc(p)}">${esc(p === "All" ? "Everyone" : shortName(p))}</button>`).join("")}
      </div>
      <table class="rates">
        <thead><tr><th scope="col">Leg</th><th scope="col" class="num" data-sort="count">Played</th><th scope="col" class="num" data-sort="rate">Hit</th></tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td>${esc(shortName(r.player))} ${esc(STAT_GROUP[r.stat].toLowerCase())}<div class="bar"><i style="width:${(r.h / r.n) * 100}%"></i></div></td>
          <td class="num">${r.n}</td><td class="num">${r.h} of ${r.n}</td></tr>`).join("")}</tbody>
      </table>

      <h2 class="section">Every slip</h2>
      ${slips.map(slipBlock).join("")}
    `;
    el.querySelectorAll(".filters button").forEach(b => b.addEventListener("click", () => { filter = b.dataset.p; draw(); }));
    el.querySelectorAll("th[data-sort]").forEach(th => th.addEventListener("click", () => { sortKey = th.dataset.sort; draw(); }));
  };
  draw();
}

function slipBlock(s) {
  const hit = s.legs.filter(l => l.hit).length;
  const missed = s.legs.length - hit;
  const result = missed === 0 ? "Cashed" : `${hit} of ${s.legs.length}`;
  const price = s.boosted ? `${fmtOdds(s.price)}, boosted to ${fmtOdds(s.boosted)}` : fmtOdds(s.price);
  const marks = s.legs.map(l => `<span class="mark ${l.hit ? "hit" : "miss"}"></span>`).join("");
  return `<details class="slip">
    <summary>
      <span class="slip-title">${s.home ? "vs" : "at"} ${esc(TEAM[s.opp] || s.opp)}, ${esc(fmtDate(s.date))}${s.label ? ` <span class="slip-sub">${esc(s.label)}</span>` : ""}</span>
      <span class="slip-result ${missed === 1 ? "near" : ""}">${result}</span>
      <span class="slip-sub">${esc(price)}. Game: ${esc(s.final)}.</span>
      <div class="strip">${marks}</div>
    </summary>
    <ul class="slip-legs">${s.legs.map(l => `<li><span class="mark ${l.hit ? "hit" : "miss"}" aria-label="${l.hit ? "hit" : "missed"}"></span>${esc(shortName(l.player))} ${esc(legLabel(l))}<span class="actual">${l.actual == null ? "" : (l.stat === "ml" || l.stat === "spread" ? (l.actual > 0 ? `won by ${l.actual}` : `lost by ${-l.actual}`) : l.actual)}</span></li>`).join("")}</ul>
    ${s.note ? `<p class="slip-note">${esc(s.note)}</p>` : ""}
  </details>`;
}

// ---------- Playbook ----------
function renderPlaybook(data, el) {
  const p = data.playbook;
  el.innerHTML = `
    <h2 class="section" style="margin-top:0">How we play</h2>
    <ul class="plain">${p.houseRules.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
    <h2 class="section">What the history says</h2>
    ${p.learned.map(r => `<div class="rule"><p>${esc(r.rule)}</p><p>${esc(r.why)}</p></div>`).join("")}
  `;
}

// ---------- Tabs + boot ----------
function setupTabs() {
  const tabs = document.querySelectorAll('[role="tab"]');
  const show = id => {
    tabs.forEach(t => {
      const on = t.id === id;
      t.setAttribute("aria-selected", on);
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    });
    history_replace(id);
    window.scrollTo(0, 0);
  };
  tabs.forEach(t => t.addEventListener("click", () => show(t.id)));
  const fromHash = location.hash.replace("#", "");
  if (fromHash && document.getElementById("t-" + fromHash)) show("t-" + fromHash);
}
function history_replace(id) { try { window.history.replaceState(null, "", "#" + id.slice(2)); } catch (e) { /* file:// */ } }

async function boot() {
  try {
    const bust = `?v=${Date.now()}`;
    const [tonight, slips, players, playbook] = await Promise.all(
      ["tonight", "slips", "players", "playbook"].map(n => fetch(`data/${n}.json${bust}`).then(r => { if (!r.ok) throw new Error(n); return r.json(); })));
    const data = { tonight, slips, players, playbook };
    $("#updated").textContent = `Updated ${new Date(tonight.updated).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
    renderTonight(data, $("#tab-tonight"));
    renderHistory(data, $("#tab-history"));
    renderPlaybook(data, $("#tab-playbook"));
  } catch (e) {
    $("#tab-tonight").innerHTML = `<p class="error">Couldn't load the picks file (${esc(e.message)}). Refresh the page; if it keeps happening, the data file in the repo has a formatting error.</p>`;
  }
  setupTabs();
}
boot();
