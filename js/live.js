// Live tracking from ESPN's free public NBA feed (no key needed).
// The browser asks ESPN directly; nothing is saved to the repo. The 6:30 PM job still grades the slip.
// app.js decides when to poll (only while The Game tab is open, the page is visible and the game is on).
window.Live = (function () {
  const BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
  // ESPN's short codes that differ from ours.
  const TO_ESPN = { GSW: "GS", NYK: "NY", SAS: "SA", NOP: "NO", UTA: "UTAH", WAS: "WSH" };
  const FROM_ESPN = Object.fromEntries(Object.entries(TO_ESPN).map(([a, b]) => [b, a]));
  const ours = a => FROM_ESPN[a] || a;
  const espn = a => TO_ESPN[a] || a;

  // "V.J. Edgecombe", "Tyrese Maxey Jr." -> "vj edgecombe", "tyrese maxey"
  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z ]/g, "").replace(/\b(jr|sr|ii|iii|iv)\b/g, "").replace(/\s+/g, " ").trim();

  async function getJSON(url) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 12000);
    try {
      // Plain GET with no custom headers, so the browser makes a simple cross-site request.
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error(`ESPN answered ${r.status}`);
      return await r.json();
    } catch (e) {
      if (e.name === "AbortError") throw new Error("ESPN took too long to answer");
      if (e instanceof TypeError) throw new Error("couldn't reach ESPN from this browser");
      throw e;
    } finally { clearTimeout(t); }
  }

  // Find tonight's game on ESPN's scoreboard for that date.
  async function findEvent(game) {
    if (game.espnId) return { id: String(game.espnId), date: null };
    const sb = await getJSON(`${BASE}/scoreboard?dates=${game.date.replace(/-/g, "")}&_=${Date.now()}`);
    const want = espn(game.opp);
    const ev = (sb.events || []).find(e => {
      const abbrs = (e.competitions?.[0]?.competitors || []).map(c => c.team?.abbreviation);
      return abbrs.includes("PHI") && abbrs.includes(want);
    });
    if (!ev) throw new Error(`ESPN doesn't list a 76ers–${game.opp} game on ${game.date}`);
    return { id: String(ev.id), date: ev.date || null };
  }

  function parseSummary(js) {
    const comp = js.header?.competitions?.[0] || {};
    const st = comp.status || {};
    const type = st.type || {};
    const score = {};
    (comp.competitors || []).forEach(c => { score[ours(c.team?.abbreviation)] = Number(c.score) || 0; });
    const players = {};
    (js.boxscore?.players || []).forEach(tm => {
      const team = ours(tm.team?.abbreviation);
      (tm.statistics || []).forEach(block => {
        const keys = block.keys || block.names || [];
        const labels = block.labels || [];
        const col = (key, label) => { const i = keys.indexOf(key); return i >= 0 ? i : labels.indexOf(label); };
        const idx = {
          min: col("minutes", "MIN"), pts: col("points", "PTS"), reb: col("rebounds", "REB"), ast: col("assists", "AST"),
          stl: col("steals", "STL"), blk: col("blocks", "BLK"), tpm: col("threePointFieldGoalsMade-threePointFieldGoalsAttempted", "3PT")
        };
        (block.athletes || []).forEach(a => {
          const s = a.stats || [];
          const num = i => (i < 0 || s[i] == null ? 0 : parseInt(String(s[i]).split("-")[0], 10) || 0);
          const rec = {
            name: a.athlete?.displayName || "", team, dnp: !!a.didNotPlay || !s.length, min: num(idx.min),
            pts: num(idx.pts), reb: num(idx.reb), ast: num(idx.ast), stl: num(idx.stl), blk: num(idx.blk), tpm: num(idx.tpm)
          };
          rec.pra = rec.pts + rec.reb + rec.ast;
          players[norm(rec.name)] = rec;
        });
      });
    });
    return {
      state: type.state || "pre",               // pre | in | post
      detail: type.shortDetail || type.detail || "",
      period: st.period || 0, clock: st.displayClock || "",
      score, players
    };
  }

  // Box-score line for one of our players: exact name first, then first initial + last name.
  function findPlayer(players, name) {
    const n = norm(name);
    if (players[n]) return players[n];
    const parts = n.split(" ");
    const last = parts[parts.length - 1], first = parts[0][0];
    const hits = Object.entries(players).filter(([k]) => { const p = k.split(" "); return p[p.length - 1] === last && p[0][0] === first; });
    return hits.length === 1 ? hits[0][1] : null;
  }

  // Where one leg stands right now: {state: live|hit|miss|void, val}. Null before tip.
  // Overs lock as hits the moment they're reached; misses only settle at the final.
  function evalLeg(leg, live, opp) {
    if (!live || !live.state || live.state === "pre") return null;
    const final = live.state === "post";
    if (leg.stat === "ml" || leg.stat === "spread") {
      if (live.score.PHI == null || live.score[opp] == null) return null;
      const m = live.score.PHI - live.score[opp];
      const ok = leg.stat === "ml" ? m > 0 : m + leg.line > 0;
      return { state: final ? (ok ? "hit" : "miss") : "live", val: m, ok };
    }
    const p = findPlayer(live.players || {}, leg.player);
    if (!p || p.dnp) return final ? { state: "void", val: null } : { state: "live", val: 0, notIn: true };
    const v = p[leg.stat] ?? 0;
    if (v >= leg.line) return { state: "hit", val: v };
    return { state: final ? "miss" : "live", val: v };
  }

  // One poll: find the game once (remembered in memo), then read its box score.
  async function fetchGame(game, memo) {
    if (!memo.eventId) {
      const ev = await findEvent(game);
      memo.eventId = ev.id; memo.tipAt = ev.date;
    }
    const js = await getJSON(`${BASE}/summary?event=${memo.eventId}&_=${Date.now()}`);
    return { ...parseSummary(js), eventId: memo.eventId, tipAt: memo.tipAt };
  }

  return { fetchGame, evalLeg, parseSummary, findPlayer, norm };
})();
