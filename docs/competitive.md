# Daily challenge and ranked duels

Two ways to measure yourself against other members, both played on server-dealt tables
(`rooms.openMatch`) and scored when the room announces `match.finished`.

| Part                | Daily challenge                         | Ranked duels                        |
| ------------------- | --------------------------------------- | ----------------------------------- |
| Server              | `apps/server/src/features/daily/`       | `apps/server/src/features/ranked/`  |
| Pure rules          |                                         | `packages/meta/src/elo.ts`          |
| Wire types          | `packages/protocol/src/daily.ts`        | `packages/protocol/src/ranked.ts`   |
| Web                 | `apps/web/src/features/daily/`          | `apps/web/src/features/ranked/`     |
| Room kind           | `daily`: the member and 2 bots          | `ranked`: two members, no bots      |
| Result at the table | score, rank, coins (`DailyResultPanel`) | rating change (`RankedResultPanel`) |

## Daily challenge

### The day and its deal

- **The day** is the calendar date in `DAILY_TIME_ZONE` (default `Europe/Paris`): the challenge
  changes at local midnight for everyone, wherever they play from. Daylight-saving days last 23
  or 25 hours; the countdown (`nextAt`) accounts for it.
- **The deal** is the same for everyone that day: `seed = deriveSeed(dayNumber, secret)` where
  `secret = HMAC-SHA256(DAILY_SALT, "YYYY-MM-DD")` (first 32 bits). Without the salt nobody can
  compute a future deal from its date, and the HMAC means that even someone who recovers a past
  seed learns nothing about the next. The seed never leaves the server: clients only receive
  their seat's view, as for every table.
- Production refuses to start without a `DAILY_SALT` of 16 characters or more. Changing it
  changes the deals of every day that has not been played yet; do it between two days.

### Attempts

- `POST /api/daily/start` opens the table (`kind: 'daily'`, the member plus `DAILY_BOTS` = 2
  bots, today's seed) and answers `{ room }`. Asked again while that table is in play, it
  answers the same room: reloading or switching devices resumes the game.
- **One attempt per member per day.** Leaving the table hands the seat to a bot and closes the
  room (nobody else is there), so the attempt is spent without a result (`abandoned`). Starting
  again that day answers `409 DAILY_DONE`.
- A game started before midnight and finished after counts for the day it started.

### Results, streaks, rewards

On `match.finished` with `kind === 'daily'` the member's row records: **won** (their seat is
among the winners), **score** (`outcome.scores[seat]`, the points they collected) and **moves**
(their own commands in the history). In the same transaction:

- **Streak**: the number of consecutive days with a _finished_ challenge. Finishing today
  continues yesterday's streak (+1), otherwise starts at 1. The current streak shown is that of
  today's or yesterday's result (a streak is not lost before the day is over), else 0. The best
  streak is kept.
- **Reward**: `DAILY_REWARD` = 20 coins, plus `DAILY_WIN_BONUS` = 30 for a win, through
  `wallet.credit` with ref `daily:<day>`: paid once per member and day, whatever is retried.

### Ranking

Finished attempts of the day, ordered by:

1. winners first,
2. then the higher score,
3. then the fewer moves,
4. then the earlier finish (so every line has its own place: `ROW_NUMBER`, not `RANK`).

`GET /api/daily` returns the top `RANKING_TOP` = 10 lines, the member's own line wherever it
is, the number of finishers, and yesterday's podium (top 3), along with the member's status
(`new`, `playing` with its room, `abandoned`, or `finished` with the result), the streak and
`nextAt`.

## Ranked duels

### Elo

Pure functions in `@cardgame/meta` (`elo.ts`):

- Everyone starts at `ELO_START` = 1000.
- Expected score of A against B: `E = 1 / (1 + 10^((Rb − Ra) / 400))`.
- After a game, with `S` = 1 (win), 0.5 (draw) or 0 (loss) for A:
  `delta = round(K × (S − E))`, `K` = `ELO_K` = 32. A gains `delta`, B loses the same `delta`:
  one rounded number, so the sum of all ratings never changes.
- A rating is **provisional** for its first `PROVISIONAL_GAMES` = 10 games (a badge on the
  screen and in the leaderboard; the formula is the same).

### Matchmaking

- `POST /api/ranked/queue` joins the queue, `DELETE` leaves it; both answer the queue status.
  `GET /api/ranked` returns the rating, games, wins, queue status, leaderboard (top
  `LEADERBOARD_TOP` = 20 plus the member's own line) and the last `RECENT_GAMES` = 10 games.
- The queue lives in memory (the server is a single instance). Every read of the status keeps
  the member in it; one who stops polling for `QUEUE_STALE_MS` = 30 s is dropped.
- Once a second the feature's `tick` pairs the queue: a member waiting `t` seconds accepts an
  opponent within `min(MAX_GAP, BASE_GAP + GAP_GROWTH × t)` points (100, +10 per second, at
  most 800). A pair needs a gap both members accept; the closest pairs are made first, ties go
  to whoever waited longest.
- Each pair gets `rooms.openMatch({ kind: 'ranked', players: [a, b] })` and a row in
  `ranked_matches`. The status turns to `matched` with the room code; the page goes there.

### Results

- On `match.finished` with `kind === 'ranked'`: if a seat no longer holds the member who
  started there (they left and a bot finished for them), that member **loses**, whatever the
  bot did. Otherwise the winner wins; two winners or none is a draw.
- If both members leave, the room closes without finishing. The tick notices who is no longer
  seated and when; once both are gone, the first to leave loses (both noticed in the same tick:
  a draw). A restart keeps `ranked_matches`, so leaving cannot dodge a result.
- Each rated game updates `ranked_ratings` and adds one row per member to `ranked_history`
  (opponent, result, change, rating after).

## Tuning

Every number above is a named constant next to the code that uses it:

| Constant                                               | File                                |
| ------------------------------------------------------ | ----------------------------------- |
| `DAILY_BOTS`, `DAILY_REWARD`, `DAILY_WIN_BONUS`        | `server/.../daily/daily-service.ts` |
| `RANKING_TOP`, `PODIUM_SIZE`                           | `server/.../daily/daily-service.ts` |
| `ELO_START`, `ELO_K`, `ELO_SCALE`, `PROVISIONAL_GAMES` | `packages/meta/src/elo.ts`          |
| `BASE_GAP`, `GAP_GROWTH`, `MAX_GAP`, `QUEUE_STALE_MS`  | `server/.../ranked/queue.ts`        |
| `LEADERBOARD_TOP`, `RECENT_GAMES`                      | `server/.../ranked/ratings.ts`      |

Changing the daily rewards or the ranking order takes effect at once; changing `ELO_K` only
affects future games. The time zone and salt are environment variables
([deployment](deployment.md#configuration)).

## Data

All tables reference `accounts(id) ON DELETE CASCADE`; the account export includes the daily
attempts (`daily.attempts`) and the rating with every rated game (`ranked`).

| Table            | Holds                                                         |
| ---------------- | ------------------------------------------------------------- |
| `daily_results`  | One row per member and day: room, then result, streak, reward |
| `ranked_ratings` | Rating, games and wins per member                             |
| `ranked_matches` | Every duel opened by matchmaking, who left when, when rated   |
| `ranked_history` | One row per member and rated game                             |
