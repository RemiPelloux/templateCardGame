# Progression

Every finished match pays experience and coins. Experience raises a member's level and season
track; matches also advance daily and weekly missions and unlock achievements. Profiles show
it all to other members.

## How it works

**What a match pays** (`packages/meta/src/rewards.ts`). Each person still seated at the end
earns:

| Result | Experience                               | Coins |
| ------ | ---------------------------------------- | ----- |
| Loss   | 20, plus 5 per opponent beyond the first | 5     |
| Win    | 50, plus 5 per opponent beyond the first | 20    |

then multiplied by the table's kind — casual ×1, daily ×1.5, ranked ×2 — and halved at a table
where the member was the only person (bots only). A casual win against one bot pays 25
experience and 10 coins; a ranked win pays 100 and 40.

A seat a bot took over earns nothing, and neither does a deleted account. Each match pays
each member once, even if the result is announced twice: the match is identified by its table,
seed and number of moves.

**Levels** (`levels.ts`) go to 50. Level _n_ needs `100 + 25 × (n − 1)` experience to pass and
pays `50 + 10 × n` coins on arrival. Levels 10, 25 and 50 also give an item: `felt-midnight`,
`back-royal`, `back-gold`. Reaching level 10 takes 1,800 experience; level 50, 34,300.

**Seasons** (`seasons.ts`) last 56 days, counted from Monday 5 January 2026. Experience earned
during a season also climbs its track: 30 steps of 300 experience, each paying 20 coins, the
last one also `frame-silver`.

**Missions** (`missions.ts`). Three daily and three weekly missions are active at a time, drawn
from fixed pools by date, so everyone has the same ones. Days are UTC; weeks start on Monday. A
completed mission is claimed by hand from the home page or the profile, and pays its coins and
experience once.

| Daily pool               | Goal | Weekly pool              | Goal |
| ------------------------ | ---- | ------------------------ | ---- |
| Play matches             | 3    | Play matches             | 15   |
| Win a match              | 1    | Win matches              | 7    |
| Win matches              | 2    | Play eights              | 15   |
| Play eights              | 3    | Play cards               | 150  |
| Play cards               | 30   | Play ranked duels        | 3    |
| Play the daily challenge | 1    | Play the daily challenge | 4    |

**Achievements** (`achievements.ts`) are permanent, each with a one-time coin reward: the first
match and the first win; 50 and 250 matches; 10, 50 (`frame-silver`) and 200 (`frame-gold`)
wins; 25 and 250 eights played; 7 daily challenges; 10 ranked wins; levels 10 and 25. They
unlock after a match or a mission claim.

**Statistics** (`stats.ts`). Missions and achievements never inspect matches themselves: a
finished match is turned into counters (`matches`, `wins`, `matches.daily`, `wins.ranked`,
`log.play`, `log.play.8`…) and they name the counter and the goal. New goals are data.

**Profiles** show a member's level, frame, statistics per kind of table, achievements and last
ten matches. Your own profile adds your season and missions. Profiles are open to signed-in
members, by handle: `/profile/ada-1234`.

**After a match** a panel under the result shows what it earned: experience, levels gained,
coins, missions advanced and achievements unlocked.

## Data

| Table              | Holds                                           |
| ------------------ | ----------------------------------------------- |
| `progression`      | Each member's experience                        |
| `season_xp`        | Experience per season                           |
| `progress_stats`   | The counters                                    |
| `match_results`    | One row per member and match, with what it paid |
| `mission_progress` | Progress and claims per mission and period      |
| `achievements`     | Unlocked achievements                           |

All are deleted with the account and included in its export.

## Tuning

| What                                  | Where                               |
| ------------------------------------- | ----------------------------------- |
| Match rewards and multipliers         | `packages/meta/src/rewards.ts`      |
| Level curve and level rewards         | `packages/meta/src/levels.ts`       |
| Mission pools and how many are active | `packages/meta/src/missions.ts`     |
| Achievements                          | `packages/meta/src/achievements.ts` |
| Season length and track               | `packages/meta/src/seasons.ts`      |

## Extending

- **A mission or an achievement**: add it to its list with a new permanent id, a counter and a
  goal, then its name in every language in `apps/web/src/features/progression/i18n.ts`
  (`missions.ids.<id>`, `achievements.ids.<id>`). A test checks every id has a translation.
- **A new counter**: derive it in `stats.ts` from the finished match; anything in the game's log
  can become one.
- **Your own game**: the counters named after Crazy Eights (`log.play.8`, eights played) need
  replacing with your game's events.

Endpoints: [HTTP API](api.md#progression-and-profiles).
