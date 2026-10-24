# Progression and profiles

Members earn **experience (XP)** and **coins** from every finished online match, climb
**levels**, complete **daily and weekly missions**, unlock **achievements** and move along the
current **season**'s track. Profiles show it all to other members.

| Where                                   | What                                                    |
| --------------------------------------- | ------------------------------------------------------- |
| `packages/meta/src/levels.ts`           | XP curve, level rewards                                 |
| `packages/meta/src/rewards.ts`          | XP and coins for one result                             |
| `packages/meta/src/stats.ts`            | The counters a match adds (`matches`, `log.play.8`…)    |
| `packages/meta/src/missions.ts`         | Mission pools, periods, the daily draw                  |
| `packages/meta/src/achievements.ts`     | Achievements and their one-time rewards                 |
| `packages/meta/src/seasons.ts`          | Season dates and the season track                       |
| `apps/server/src/features/progression/` | Listens to `match.finished`, pays, serves the endpoints |
| `apps/server/src/features/profile/`     | Public profiles (read-only over progression's tables)   |
| `apps/web/src/features/progression/`    | Missions panel, result panel, level bars, achievements  |
| `apps/web/src/features/profile/`        | The profile screen                                      |

Everything in `meta` is pure: the server decides with it, the client may display with it.

## After a match

When a room announces `match.finished`, progression handles **each person still in their seat**
(a seat a bot took over earns nothing) in **one transaction**:

1. A `match_results` row keyed by `room:seed:version`. If it already exists the event was
   replayed: nothing else happens, so a duplicate event never pays twice.
2. Coins for the match (`wallet.credit`, ref `reward:<key>`).
3. The match's **tally** (`tallyMatch`) is added to the member's lifetime counters.
4. XP goes to the level curve (each level crossed pays, ref `level:<n>`) and to the season of
   the match's end (each step pays, ref `season:<season>:<step>`).
5. Missions on at the match's end advance; newly reached achievements unlock and pay
   (ref `achievement:<id>`).
6. A summary of all this is stored with the row: `GET /api/progression/result/:room` returns
   it, and the table's result panel shows it, then refreshes the wallet.

All coins go through `services.wallet` with a unique `ref`, all items through
`services.inventory.grant` (idempotent), so the whole chain can safely run again.

### Tallies

A tally is a flat record of counters for one seat:

- `matches`, `wins`, and per kind `matches.daily`, `wins.ranked`…
- `log.<event>` for each log entry of that seat (`log.play` = cards played, `log.draw`…), and
  `log.<event>.<rank>` when the entry carries a card (`log.play.8` = eights played).

It is derived from the game's own log, so a new game gets counters for its own events without
touching progression. The engine keeps the last 200 log entries (`MAX_LOG`); counters of very
long matches only see those.

## Rewards and levels

`matchReward` pays `PLAY_XP` (+ `WIN_XP` for a win, + `EXTRA_OPPONENT_XP` per opponent beyond
the first) and `PLAY_COINS` (+ `WIN_COINS`). The total is scaled by `KIND_PERCENT` (casual 100,
daily 150, ranked 200) and by `BOTS_ONLY_PERCENT` (50) when no other person sat at the table.

Levels run to `MAX_LEVEL` (50); going from level _n_ to _n + 1_ takes
`XP_FIRST_LEVEL + XP_STEP × (n − 1)` XP. Reaching a level pays
`LEVEL_COINS_BASE + n × LEVEL_COINS_PER_LEVEL` coins, plus an item from `LEVEL_ITEMS`.

## Missions

Each UTC day draws `MISSIONS_PER_PERIOD.daily` missions from the daily pool, and each week
(from Monday) `MISSIONS_PER_PERIOD.weekly` from the weekly pool. The draw depends only on the
date, so it is the same for everyone and nothing records which missions are on. Progress is
stored per mission and period (`mission_progress`), so a new day simply starts at zero.

A complete mission is **claimed** by the member (`POST /api/progression/missions/:id/claim`):
it pays its coins (ref `mission:<id>:<period>`) and its XP, once. Rewards of a mission left
unclaimed when its period ends are lost.

### Adding a mission

1. Append to `MISSIONS` in `packages/meta/src/missions.ts`:
   `daily('daily-draw-10', 'log.draw', 10, 40, 20)` (id, counter, goal, XP, coins).
2. Name it in `apps/web/src/features/progression/i18n.ts` under `missions.ids`, in every
   language, with plural forms (`{count}` is the goal).
3. `pnpm test` checks ids are unique and every mission is translated.

Ids are permanent: progress rows reference them.

## Achievements

An achievement unlocks once, when a lifetime counter (or `level`) reaches its goal, and pays
`reward.coins` and optionally `reward.item`.

### Adding an achievement

1. Append to `ACHIEVEMENTS` in `packages/meta/src/achievements.ts`:
   `trophy('draws-100', 'log.draw', 100, 150)`.
2. Add `name` and `text` under `achievements.ids` in the progression bundle, in every language.

Members who already passed the goal unlock it with their next match.

## Seasons

Seasons are back-to-back ranges of `SEASON_DAYS` (56) days from `SEASON_EPOCH`. XP earned during
a season also fills that season's track: one step per `SEASON_XP_PER_LEVEL`, up to
`SEASON_MAX_LEVEL`, each paying `SEASON_LEVEL_COINS` (and an item from `SEASON_ITEMS`). The
track starts from zero each season; the level curve does not.

## Endpoints

| Method | Path                                  | Answer                                         |
| ------ | ------------------------------------- | ---------------------------------------------- |
| GET    | `/api/progression`                    | Level, missions, achievements, season          |
| POST   | `/api/progression/missions/:id/claim` | Coins and XP paid, and the new progression     |
| GET    | `/api/progression/result/:room`       | What the member's last match there earned      |
| GET    | `/api/profile`                        | The member's own profile                       |
| GET    | `/api/profile/:handle`                | A member's profile (`ada-1234` for `ada#1234`) |

Errors: `MISSION_UNAVAILABLE` (404), `MISSION_INCOMPLETE` and `MISSION_CLAIMED` (409),
`PROFILE_NOT_FOUND` (404).

## Tables

| Table              | Holds                                                         |
| ------------------ | ------------------------------------------------------------- |
| `progression`      | Total XP per member                                           |
| `season_xp`        | XP per member and season                                      |
| `progress_stats`   | Lifetime counters (tallies summed; `level` keeps the highest) |
| `match_results`    | One row per member and match, with the stored summary         |
| `mission_progress` | Progress and claim time per member, mission and period        |
| `achievements`     | Unlock time per member and achievement                        |

All reference `accounts(id) ON DELETE CASCADE` and are in the account export.

## Tuning

Every number is a named constant in `packages/meta/src`. To make progress faster, raise the
reward constants rather than lowering the curve: past levels are computed from total XP, so
changing `XP_FIRST_LEVEL` or `XP_STEP` moves every member's level (rewards already paid stay
paid, and refs keep a level from paying twice). Run `pnpm exec vitest run packages/meta` after
a change: the tests pin the curve's shape and check every item id against the catalog.
