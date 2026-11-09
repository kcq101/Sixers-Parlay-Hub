# Sixers Parlay Hub

Our Sixers same-game parlay picks, history and playbook. View-only site, built for phones.

- **The Game** — the next game's suggested 9-leg and 10-leg slips: estimated price, profit and return (illustrative $10 stake), each leg's season bars, hit count and season average, automatic-update schedule, injuries and notes.
- **AI: The Answers** — overlap and correlated-risk checks, injury and minutes notes, bench swaps, why each leg, the price tuner, and the house rules (collapsed at the bottom).
- **Previous Parlays** — every slip we've played, graded leg by leg, with filters.
- **Stats** — season P/L, near misses, legs hit per ticket, and hit rates by player, prop type and leg.
- **Shoot Around** — a free-throw mini-game. The Waterfront court is live; South Philly and Center City are built but switched off in `js/app.js` (`SHOOT_COURTS`) while they're refined. Flick up to shoot. Opens full-screen from the tab; the game itself lives in `game/`.

## Shoot Around (`game/`)
A separate page that the tab opens on top of the hub, so its touch handling can't fight the page's scrolling and its code only downloads when someone taps Play. It also works on its own at `game/index.html`.
- `js/shot.js` — reads the flick (speed = power, angle = aim) and applies the forgiveness curve
- `js/physics.js` — ball flight, rim, backboard, floor and net; decides swish, rattled in, front/back/side rim, airball
- `js/courts/` — one file per court, picked with `game/index.html?court=south-philly | waterfront | center-city` (the hub card has a picker). Courts don't know about the ball, hoop or shooter. `kit.js` holds the shared parts (instancing, fences, lamps, pavement and court paint, the Philadelphia skyline, fake light pools). `south-philly-street.js` (sunset), `waterfront.js` (Ben Franklin Bridge, night), `center-city.js` (City Hall, night); `south-philly-night.js` is the first night version, kept for later
- `sprites/shooter.webp` + `shooter.json` — the shooter as pre-rendered animation frames (cut from a green-screen clip), shown on a flat card facing the camera like classic arcade games; `js/sprite-shooter.js` plays them and hands the ball to the physics at the release frame
- `tools/keyframes.py` — rebuilds the sprite sheet from a new green-screen clip: `python3 game/tools/keyframes.py clip.gif game/sprites/shooter.webp game/sprites/shooter.json`
- `js/shooter.js` — simple stand-in shown while the animation loads, or if it fails
- `vendor/` — Three.js r170 (MIT), kept in the repo so nothing loads from outside
- `node game/tests/sweep.mjs` — prints what happens across a grid of flick errors and checks the basics

Tuning (forgiveness, flick speed, arc, etc.) is in the game's slider panel and is saved on each phone.

## Automation
Scheduled Claude runs keep the site current: draft → refresh → final check → grade for each game, and each grading run drafts and schedules the next game. A daily watchdog repairs the chain. The steps and rules every run follows are in `automation/RUNBOOK.md`.

## Data
Everything the page shows lives in `data/`:
- `tonight.json` — the current picks (rewritten before each game)
- `slips.json` — every slip played, with each leg graded
- `players.json` — season game logs, used for the bars, hit counts and season averages
- `playbook.json` — rules
- `schedule.json` — the automatic refresh and grading runs

Estimated prices multiply each leg's price, then take off about 15% because FanDuel pays less when legs are related. The FanDuel screenshot is always the real number.

**Pricing rules for the pre-game refresh:** a leg's `price` must come from a line posted for *this* game (FanDuel first, then another book, named in `priceNote`). Never guess and never carry a price over from an earlier game — prices move with the opponent. If no price is posted, set `"price": null` and `"priceNote": "price unknown"`; the page marks it with "?" and leaves it out of the estimate. Set `game.spread` (e.g. `"Sixers -9.5"`) so the estimate shows the opponent's record and the spread. Once Kevin's FanDuel slip is in, set the slip's `fdPrice` and the page uses it in place of the estimate.

Images are in `assets/`. Team badges are drawn in the page in each team's colors; they aren't league logos.
