# Sixers Parlay Hub

Our Sixers same-game parlay picks, history and playbook. View-only site, built for phones.

- **The Game** — the next game's suggested 9-leg and 10-leg slips: estimated price, profit and return (illustrative $10 stake), each leg's season bars, hit count and season average, automatic-update schedule, injuries and notes.
- **AI: The Answers** — overlap and correlated-risk checks, injury and minutes notes, bench swaps, why each leg, the price tuner, and the house rules (collapsed at the bottom).
- **Previous Parlays** — every slip we've played, graded leg by leg, with filters.
- **Stats** — season P/L, near misses, legs hit per ticket, and hit rates by player, prop type and leg.
- **Shoot Around** — a free-throw mini-game on a South Philly court. Flick up to shoot. Opens full-screen from the tab; the game itself lives in `game/`.

## Shoot Around (`game/`)
A separate page that the tab opens on top of the hub, so its touch handling can't fight the page's scrolling and its code only downloads when someone taps Play. It also works on its own at `game/index.html`.
- `js/shot.js` — reads the flick (speed = power, angle = aim) and applies the forgiveness curve
- `js/physics.js` — ball flight, rim, backboard, floor and net; decides swish, rattled in, front/back/side rim, airball
- `js/courts/` — one file per court; courts don't know about the ball or hoop, so they can be swapped
- `js/shooter.js` — placeholder player; replace with licensed art later
- `vendor/three.module.min.js` — Three.js r170 (MIT), kept in the repo so nothing loads from outside
- `node game/tests/sweep.mjs` — prints what happens across a grid of flick errors and checks the basics

Tuning (forgiveness, flick speed, arc, etc.) is in the game's slider panel and is saved on each phone.

## Data
Everything the page shows lives in `data/`:
- `tonight.json` — the current picks (rewritten before each game)
- `slips.json` — every slip played, with each leg graded
- `players.json` — season game logs, used for the bars, hit counts and season averages
- `playbook.json` — rules
- `schedule.json` — the automatic refresh and grading runs

Estimated prices multiply each leg's price, then take off about 15% because FanDuel pays less when legs are related. The FanDuel screenshot is always the real number.

Images are in `assets/`. Team badges are drawn in the page in each team's colors; they aren't league logos.
