# Sixers Parlay Hub

Our Sixers same-game parlay picks, history and playbook. View-only site, built for phones.

- **The Game** — the next game's suggested 9-leg and 10-leg slips: estimated price, profit and return (illustrative $10 stake), each leg's season bars, hit count and season average, automatic-update schedule, injuries and notes.
- **AI: The Answers** — overlap and correlated-risk checks, injury and minutes notes, bench swaps, why each leg, the price tuner, and the house rules (collapsed at the bottom).
- **Previous Parlays** — every slip we've played, graded leg by leg, with filters.
- **Stats** — season P/L, near misses, legs hit per ticket, and hit rates by player, prop type and leg.

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
