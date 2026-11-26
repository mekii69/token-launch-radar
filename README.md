[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/mekii69/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/mekii69/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

# Token Launch Radar

A ranked board of pre-token protocols, scored from one frozen DefiLlama snapshot (14 November 2026) and shown on a static dashboard that needs no network at all.

## What it claims

Every protocol in the snapshot whose record shows **no token** and whose TVL is at least **$50M** is ranked by an **implied value**: what a token would be worth if the protocol traded like its already-tokenized peers.

```
implied value = TVL × peer multiple × growth × maturity × breadth
```

- **Peer multiple** — the median market-cap-to-TVL ratio of the tokenized protocols in the same category, shrunk toward the global median (`k = 8`) so a thin category cannot set a wild multiple, and capped at 4× the global median so one thin peer cannot price a whole category. Categories with no tokenized peers use the global median.
- **Growth** — the seven-day TVL change, clamped to −50%…+100% and taken at half weight, so a hot week lifts a row but cannot carry it.
- **Maturity** — 0.7 at listing, rising to 1.0 at three years tracked. Unknown age counts as 365 days.
- **Breadth** — 1.00 on one chain, +2% per extra chain, up to 1.10.

Ranked rows pass the snapshot's own watchlist rule, applied to every row alike: never an exchange, bridge, liquid staking or restaking product, never a name carrying a whole word wrapped, staked or staking, beginning with an exchange's name, or ending in a version marker. Those are wrapped, staked or bridged products of a token that already trades, not launches — the rule keeps WBTC, Binance staked ETH and USDT0 off the board the way it keeps them off the watchlist.

No protocol name is special-cased anywhere. The dashboard shows the full breakdown behind every row — peer multiple, peers, growth, maturity, breadth — and a concrete farm plan for each protocol, with the cost and time of every step stated. Protocols that already trade are set aside on their own tab at the market's own value, never ranked.

The 40 protocols on the competition watchlist are marked on the board; all 40 sit above the $50M floor, so every one is ranked.

## Run it

```sh
node main.ts --input /input/snapshot.json --output /output
```

`main.ts` reads the snapshot, writes `board.json` (the ranked rows), `data.js` (the data beside the dashboard), copies `dashboard/` and `screenshots/`, and writes `dossier.json`. Standard library only; Node 22+.

## Layout

- `main.ts` — the program contract: read, score, write, copy, dossier.
- `lib/model.ts` — the snapshot parser, the peer-multiple model, the board builder, the farm-plan rules.
- `dashboard/` — `index.html`, `app.css`, `app.js`: the static board. The farm plans it shows follow the same rules as `lib/model.ts`, so the page and `board.json` agree.
- `vendor/makefun-board.ts` — the vendored make.fun dossier library, unchanged.
- `screenshots/` — the board, a detail view, and a filtered view, taken from the dashboard itself.

## Source and limits

Source: DefiLlama protocol data, frozen 14 November 2026, supplied as the competition snapshot. Implied values are this radar's own claim: they do not predict whether or when a token is issued, and a protocol whose record shows no token may still have one its record does not carry.

License: MIT.
