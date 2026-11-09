# Sixers Parlay Hub — automation runbook

Every scheduled run follows this file. A task prompt names the game and the step(s) to run. Nobody is watching a run: don't ask questions, make the most reasonable call, and report it.

The cycle for each game is: **Draft → Refresh → Final check → Grade**. After grading, the run drafts the next game and schedules that game's steps, so the season runs as one chain. A daily **Watchdog** fixes the chain if a run fails.

## 0. Setup (every run)
1. `add_repo` owner `kcq101`, repo `Sixers-Parlay-Hub`, access `push`. Clone it to `/home/claude/sixers-parlay-hub` as the tool says, then register the repo root.
2. Read `README.md`, every file in `data/`, and enough of `js/app.js` to understand the data shapes.
3. Leg format: `{player, stat, line, price, priceNote, tag, note}`.
   - `stat` is one of `tpm|stl|blk|reb|ast|pts|pra|ml|spread`; `pra` = pts + reb + ast.
   - `line` is the X+ threshold.
   - Spread: `-2.5` means the Sixers must win by 3+. `+4.5` means they can lose by up to 4.
   - `ml` and `spread` legs: `actual` is the Sixers' final margin (positive = won).
4. Tools: use `fetch_sports_data` (league `nba`) for schedule, scores, box scores and standings. Use web search for injuries, lines and prop prices.

## Pricing rules (mandatory in every step)
- Only use prices posted for **this** game: FanDuel first, otherwise another book named in `priceNote` (e.g. "DraftKings via Covers, 12:45 PM").
- Never guess a price, and never carry one over from another game. Prices move with the opponent.
- If no price is posted for a leg, set `"price": null` and `"priceNote": "price unknown"`.
- Keep `game.spread` current, e.g. `"Sixers -1.5"`.
- Only Kevin's FanDuel screenshot sets a slip's `fdPrice`. Never set it yourself.

## Pick rules (from data/playbook.json — re-read it, it wins if they differ)
- FanDuel same-game parlay. Two slips per game, 9 legs each, about +1000 before boost; each leg roughly -250 to -550.
- Slip 1 is **"Props only"**. Slip 2 adds a game line: a small favorite's spread, the moneyline if the Sixers are clear favorites, or plus points (e.g. +4.5) in a near pick'em. Name it after the line, e.g. "With -5.5" or "With +4.5".
- Maxey-heavy. Core legs: Brown pts + reb + ast, VJ threes, LeBron steals.
- Keep pts + reb + ast legs to about 3.
- Embiid: no threes, blocks or pts + reb + ast. Rebounds only, tagged Risky.
- Maxey 4+ assists is too short. Keep VJ pts + reb + ast at 15+.
- Against good defenses or low totals, don't nudge lines up.
- Pick lines from season hit rates in `players.json` (aim for about 80%+), matchup, and how each leg has done on our slips (`slips.json`).

## Step A — Draft (run right after grading the previous game, or by the Watchdog)
1. Find the next Sixers game with `fetch_sports_data` (scores, team 76ers): date, tip (ET), opponent, home/away. Get both records from standings.
2. Check whether it's the second night of a back-to-back (Embiid usually sits) and look at early injury news.
3. Get the line if one is posted: spread, moneyline, total, and the last meeting.
4. Rewrite `data/tonight.json` in the existing shape:
   - `status` "draft"; `game` {date, tip, opp, oppName, home, venue, records, spread, line, lastMeeting}; `injuries`.
   - Two slips. Each leg's `note` gives its season hit count (e.g. "9 of 10 games").
   - `bench` with 3–4 swap options and `tuner` with 3–4 lines.
   - Prices follow the pricing rules (usually null at draft time).
   - `statusNote` says it's a draft and when the refresh runs.
5. Rewrite `data/schedule.json` with this game's runs (Refresh, Final check before tip, Grade the slip), all `"status": "scheduled"`, times as ISO with the ET offset.
6. Then do **Step E** to schedule them.

## Step B — Refresh (game day)
1. Get the latest official injury report for both teams, plus the spread, moneyline and total.
2. Find prop and alt-line prices for every leg (FanDuel research, Covers, Action Network, SportsBettingDime, Rotowire).
3. Update `injuries`, `game.line`, `game.spread`, records and `updated`, and fill prices.
4. If a leg's player is out or doubtful, swap the leg using the bench and pick rules. If a price puts a leg far outside -200 to -550, say so in `statusNote` and suggest the fix; don't change lines silently.
5. Keep `status` "draft". Set `statusNote` to what you checked, when, and what changed.
6. Fill any `players.json` gaps from earlier games if you can find the numbers.
7. Mark the schedule entry `done` with `doneAt` and a one-sentence `result`, or `failed` with the reason.

## Step C — Final check before tip (~40 min before tip)
1. Check the final injury report, starting lineups, any minutes limits, and the line.
2. Never change a slip that has `fdPrice` set: Kevin already placed it. Only note risks.
3. For unplaced slips, swap legs whose player is out, doubtful or limited.
4. Set `status` to "final" if no slip has `fdPrice` yet.
5. Update `statusNote` and the schedule entry.

## Step D — Grade (~2 h 55 min after tip)
1. Confirm the game is final (scores). If it isn't, wait 15 minutes and retry, up to 4 times. If it never goes final, mark the entry `failed`, push, message Kevin, and stop. Don't draft the next game; the Watchdog will.
2. Pull the box score (`game_stats`). The feed often leaves players out (it has never included Jaylen Brown). Find missing players among Maxey, VJ Edgecombe, Brown, LeBron, Embiid, Simons and Caldwell-Pope on nba.com, ESPN or CBS. If a player didn't play, note DNP. Never invent numbers.
3. `players.json`: append the game to `games[]` and each player's line `{date, pts, reb, ast, stl, blk, tpm}`.
4. `tonight.json`: add `actual` and `hit` to every leg. A DNP leg gets `actual` null, `hit` null and the note "Did not play (FanDuel usually voids this leg)". Set `status` "graded" and write a `statusNote` per slip.
5. `slips.json`: append **only** slips with `fdPrice` set, matching the existing entry shape (`label` = slip name in lowercase). If none were placed, append nothing and say so.
6. `playbook.json`: change it only if a rule clearly changed.
7. Mark the schedule entry `done`.
8. Commit and push (Step F), and message Kevin the result.
9. **Then run Step A for the next game, and Step E.** Commit and push again, and send Kevin one combined message.

## Step E — Schedule a game's runs
1. Call `list_triggers` first. Task names are `Sixers parlay: <step> <YYYY-MM-DD> <OPP>`, e.g. `Sixers parlay: refresh 2026-11-12 TOR`. Never create a task whose name already exists and is enabled.
2. Create three one-time tasks with `create_trigger`: `initiation` "human_schedule", `notifications` {"push": true}, `run_once_at` as a local time with `[America/New_York]`.
   - **refresh** — 12:40 PM on game day if tip is 6 PM or later; otherwise tip minus 3 hours. Prompt: `Follow automation/RUNBOOK.md in repo kcq101/Sixers-Parlay-Hub: Setup, then Step B (Refresh) for <OPP> <home/away> on <date>, tip <time> ET.`
   - **final check** — tip minus 40 minutes. Prompt: same pattern with Step C.
   - **grade** — tip plus 2 hours 55 minutes. Prompt: same pattern with Step D (which includes drafting and scheduling the next game).
3. If a computed time has already passed, do that step now in this run instead of scheduling it.
4. If `create_trigger` isn't available, say so in Kevin's message. The Watchdog will retry.

## Step F — Ship (every run that changes files)
1. Validate every JSON file (`python3 -m json.tool`) and run `node --check js/app.js js/live.js`.
2. Commit with a clear message. End it with the attribution lines your session gives you; if none, use `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
3. Fetch `origin main`, rebase, and push to `main`.
4. Message Kevin with `SendUserMessage`, under 8 lines: what changed, injuries that matter, the line, any slip prices, and kcq101.github.io/Sixers-Parlay-Hub. On draft and refresh runs, remind him to send the FanDuel screenshot once he builds the slip. Never call a leg a sure thing, and never suggest bets beyond the picks.

## Watchdog (daily, recurring)
1. Find the next Sixers game that hasn't been played (scores).
2. If `tonight.json` isn't for that game and the previous game is graded (or has no grading task left), run Step A.
3. If the previous game isn't graded and its grade task is gone or failed, run Step D for it first.
4. Run Step E for the next game: create any of its three tasks that are missing.
5. If nothing was missing, change nothing and send no message. Otherwise ship (Step F) and tell Kevin what you fixed.
