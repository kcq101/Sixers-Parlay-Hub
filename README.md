# Sixers Parlay Hub

Our Sixers same-game parlay picks, history and playbook. View-only site, built for phones.

- **Tonight** — the suggested 9-leg and 10-leg slips, each leg's season hit strip, bench swaps and price tuner.
- **History** — every slip we've played, graded leg by leg, plus hit rates by leg type.
- **Playbook** — house rules and what the history has taught us.

## Data
Everything the page shows lives in `data/`:
- `tonight.json` — the current picks (rewritten before each game)
- `slips.json` — every slip played, with each leg graded
- `players.json` — season game logs used for the hit strips
- `playbook.json` — rules

Estimated prices multiply each leg's price, then take off about 15% because FanDuel pays less when legs are related. The FanDuel screenshot is always the real number.
