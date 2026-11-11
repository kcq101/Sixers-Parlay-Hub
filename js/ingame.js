// In-game read: rough chance each leg hits, from the live ESPN box score, the clock and the
// season log. Runs in the browser on every live poll (every 2 min); nothing is saved.
// It's a simple model, not a sportsbook's: it blends the player's season rate with how he's
// playing tonight, trims his remaining minutes for blowouts and foul trouble, and treats legs
// as independent when it multiplies them into a slip chance.
window.InGame = (function () {
  // How spread out the rest-of-game total is, relative to its average (variance / mean).
  // Points come in 2s and 3s, so they swing more than steals or blocks.
  const SPREAD = { pts: 2.2, pra: 2.0, reb: 1.25, ast: 1.25, tpm: 1.15, stl: 1, blk: 1 };
  // Minutes of season form counted against tonight's form. Rare stats (steals, blocks) need more,
  // so a quiet first half doesn't sink them.
  const PRIOR_MIN = { stl: 60, blk: 60, tpm: 40, reb: 30, ast: 30, pts: 24, pra: 24 };
  const MARGIN_SD = 13;          // spread of a full game's final margin (points)

  // ---- small math helpers ----
  function lgamma(z) {   // Lanczos approximation
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
    z -= 1;
    let x = c[0];
    for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  // P(X >= k) where X has mean mu and variance phi*mu (Poisson if phi ~ 1, negative binomial above).
  function atLeast(k, mu, phi) {
    if (k <= 0) return 1;
    if (!(mu > 0)) return 0;
    let below = 0;
    if (phi <= 1.01) {
      for (let x = 0; x < k; x++) below += Math.exp(-mu + x * Math.log(mu) - lgamma(x + 1));
    } else {
      const r = mu / (phi - 1), p = 1 / phi;     // successes r, success prob p; mean r(1-p)/p = mu
      for (let x = 0; x < k; x++) below += Math.exp(lgamma(x + r) - lgamma(r) - lgamma(x + 1) + r * Math.log(p) + x * Math.log(1 - p));
    }
    return Math.min(1, Math.max(0, 1 - below));
  }
  function normCdf(x) {   // Abramowitz-Stegun erf
    const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2);
    return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  }

  // ---- the clock ----
  // "5:32" -> 332 seconds, "34.5" -> 34.5
  function clockSec(s) {
    const str = String(s || "0");
    if (str.includes(":")) { const [m, sec] = str.split(":"); return (+m || 0) * 60 + (parseFloat(sec) || 0); }
    return parseFloat(str) || 0;
  }
  // Game minutes played and left. Overtime adds 5-minute periods; we only count the one being played.
  function gameClock(L) {
    if (!L || L.state === "pre") return { elapsed: 0, remaining: 48, period: 0 };
    if (L.state === "post") return { elapsed: 48, remaining: 0, period: L.period };
    const p = Math.max(1, L.period || 1), left = clockSec(L.clock) / 60;
    if (p <= 4) { const el = (p - 1) * 12 + (12 - left); return { elapsed: el, remaining: Math.max(0, 48 - el), period: p }; }
    return { elapsed: 48 + (p - 5) * 5 + (5 - left), remaining: Math.max(0, left), period: p };
  }
  const quarterName = p => (p <= 4 ? ["", "1st", "2nd", "3rd", "4th"][p] : p === 5 ? "OT" : `${p - 4}OT`);

  // Share of the remaining minutes starters are likely to play, given the score.
  function blowoutFactor(clk, margin) {
    const a = Math.abs(margin);
    if (clk.elapsed >= 40) return a >= 20 ? 0.25 : a >= 15 ? 0.6 : 1;
    if (clk.elapsed >= 36) return a >= 22 ? 0.35 : a >= 17 ? 0.7 : 1;
    if (clk.elapsed >= 24) return a >= 28 ? 0.6 : 1;
    return 1;
  }
  function foulFactor(pf, clk) {
    if (pf >= 6) return 0;
    if (pf === 5) return clk.elapsed >= 42 ? 0.85 : 0.65;
    if (pf === 4 && clk.elapsed < 36) return 0.8;
    if (pf === 3 && clk.elapsed < 24) return 0.85;
    return 1;
  }

  // Pre-game expected Sixers margin from "Sixers +1.5" / "Sixers -6.5" (0 if unknown).
  function expectedMargin(spread) {
    const m = String(spread || "").match(/Sixers\s*([+-]?\d+(\.\d+)?)/i);
    return m ? -parseFloat(m[1]) : 0;
  }

  // One leg. ev = Live.evalLeg result; seasonAvg = per-game average (number) or null.
  // Returns {p, label, cls, proj, note}.
  function legRead(leg, ev, L, opts) {
    const clk = gameClock(L);
    const us = L?.score?.PHI ?? 0, them = L?.score?.[opts.opp] ?? 0;
    const margin = us - them;
    if (!ev) return null;
    if (ev.state === "hit") return { p: 1, label: "Hit", cls: "hit", note: "" };
    if (ev.state === "miss") return { p: 0, label: "Missed", cls: "miss", note: "" };
    if (ev.state === "void") return { p: 1, label: "Void", cls: "void", note: "Didn't play; FanDuel drops the leg." };

    if (leg.stat === "ml" || leg.stat === "spread") {
      const frac = clk.remaining / 48;
      const mu = margin + expectedMargin(opts.spread) * frac;
      const sd = Math.max(0.6, MARGIN_SD * Math.sqrt(frac));
      let p;
      if (leg.stat === "ml") p = (1 - normCdf((0.5 - mu) / sd)) + 0.5 * (normCdf((0.5 - mu) / sd) - normCdf((-0.5 - mu) / sd));
      else p = 1 - normCdf((-leg.line - mu) / sd);
      const lead = margin > 0 ? `Up ${margin}` : margin < 0 ? `Down ${-margin}` : "Tied";
      const left = clk.remaining >= 1 ? `${Math.round(clk.remaining)} min left` : "under a minute left";
      return finish(p, { note: `${lead} with ${left}.` });
    }

    const pl = ev.player || {};
    const v = ev.val || 0, need = leg.line - v;
    const min = pl.min || 0, pf = pl.pf || 0;
    const avg = opts.seasonAvg;
    const priorRate = avg != null ? avg / 48 : null;          // per game-minute, so it doesn't depend on his usual minutes
    // How much of the game he's on the floor tonight, leaning on a normal starter's share early on.
    const share = (min + 0.7 * 8) / (clk.elapsed + 8);
    const liveRate = min > 0 ? v / min : 0;
    // Per minute he plays: season rate (converted with tonight's share, so bench players aren't
    // shortchanged) blended with tonight's rate.
    const seasonPerMin = priorRate != null ? priorRate / share : liveRate;
    const k = PRIOR_MIN[leg.stat] || 24;
    const rate = (v + seasonPerMin * k) / (min + k);
    const blow = blowoutFactor(clk, margin), fouls = foulFactor(pf, clk);
    const minsLeft = clk.remaining * Math.min(0.95, share) * blow * fouls;
    const mu = rate * minsLeft;
    const p = atLeast(need, mu, SPREAD[leg.stat] || 1.2);
    const proj = Math.round(v + mu);

    const notes = [];
    if (ev.notIn && clk.elapsed >= 6) notes.push("Hasn't checked in yet.");
    if (pf >= 5) notes.push(`${pf} fouls: one more and he's out.`);
    else if (pf >= 4 && clk.elapsed < 42) notes.push(`${pf} fouls: may sit to protect them.`);
    else if (pf >= 3 && clk.elapsed < 24) notes.push(`${pf} fouls in the first half.`);
    if (blow < 1) notes.push(`${margin > 0 ? "Up" : "Down"} ${Math.abs(margin)}: starters could sit the rest of the way.`);
    const pace = `Projects to about ${proj} (needs ${leg.line}). ${need === 1 ? "Needs 1 more" : `Needs ${need} more`}${min ? ` · ${min} min played` : ""}.`;
    return finish(p, { proj, note: [pace, ...notes].join(" ") });
  }

  function finish(p, extra) {
    const label = p >= 0.8 ? "Looking good" : p >= 0.55 ? "On track" : p >= 0.3 ? "Needs a push" : "In trouble";
    const cls = p >= 0.8 ? "good" : p >= 0.55 ? "ok" : p >= 0.3 ? "push" : "bad";
    return { p, label, cls, ...extra };
  }

  // Whole slip: reads per leg, plus a one-paragraph summary.
  function slipRead(legs, reads, L, opp) {
    const clk = gameClock(L);
    const live = reads.map((r, i) => ({ r, l: legs[i] })).filter(x => x.r);
    if (!live.length) return null;
    const chance = live.reduce((a, x) => a * x.r.p, 1);
    const open = live.filter(x => x.r.p > 0 && x.r.p < 1 && x.r.label !== "Hit");
    const missed = live.filter(x => x.r.label === "Missed");
    const worst = [...open].sort((a, b) => a.r.p - b.r.p).slice(0, 2);
    const us = L?.score?.PHI ?? 0, them = L?.score?.[opp] ?? 0;
    const when = L.state === "post" ? "Final" : clk.period ? quarterName(clk.period) : "";
    let text;
    if (missed.length) text = `${missed.length === 1 ? "A leg has" : `${missed.length} legs have`} missed, so this slip is done: ${missed.map(x => short(x.l)).join(", ")}.`;
    else if (!open.length) text = "Every leg is in. This slip has hit.";
    else {
      const sure = live.filter(x => x.r.label === "Hit").length;
      text = `${sure} of ${legs.length} legs already hit. ${worst.length ? `Biggest worries: ${worst.map(x => `${short(x.l)} (${pctTxt(x.r.p)})`).join(" and ")}.` : ""}`;
    }
    return { chance: missed.length ? 0 : chance, text, when, score: `${us}–${them}`, worst: worst.map(x => x.l) };
  }
  const short = l => `${l.player === "76ers" ? "Sixers" : l.player.split(" ").slice(-1)[0]} ${l.stat === "ml" ? "moneyline" : l.stat === "spread" ? `${l.line > 0 ? "+" : ""}${l.line}` : `${l.line}+ ${{ tpm: "threes", stl: "steals", blk: "blocks", reb: "reb", ast: "ast", pts: "pts", pra: "PRA" }[l.stat] || l.stat}`}`;
  function pctTxt(p) {
    if (p === 0) return "0%";
    if (p === 1) return "100%";
    if (p >= 0.995) return "99%+";
    if (p <= 0.005) return "under 1%";
    return `${Math.round(p * 100)}%`;
  }

  return { legRead, slipRead, gameClock, atLeast, pctTxt, expectedMargin, clockSec };
})();
