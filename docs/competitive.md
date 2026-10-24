# Competitive

Two ways to measure yourself: the **daily challenge**, the same deal for everyone once a day,
and **ranked duels**, two-player matches that move an Elo rating.

## Daily challenge

**The deal.** Each day, every member gets the same deal against two bots. The day follows a
time zone (`DAILY_TIME_ZONE`, `Europe/Paris` by default), and a new challenge opens at its
midnight, daylight saving included. The seed mixes the date with a secret (`DAILY_SALT`, at
least 16 characters, required in production) through an HMAC, so nobody can compute
tomorrow's deal, and the seed never leaves the server.

**One attempt.** _Play today's deal_ opens a server table. Coming back to it while still seated
resumes it; once finished or left, the day is done (`409 DAILY_DONE`). A table left idle for
two hours closes, and the attempt counts as abandoned.

**Ranking.** Finishers are ordered by: winners first, then the highest score, then the fewest
moves, then the earliest finish. The page shows the top 10, your own rank, the number of
finishers and yesterday's podium.

**Streaks.** A streak counts consecutive days with a finished challenge. It survives until the
end of a day you have not played yet. Your best streak is kept.

**Reward.** Finishing pays 20 coins, plus 30 for a win, once per day. Like any match, it also
pays experience and coins through [progression](progression.md), at ×1.5.

## Ranked duels

**Elo** (`packages/meta/src/elo.ts`). Everyone starts at 1000. After a duel, with ratings _A_
and _B_ and _S_ = 1 for a win:

```text
expected = 1 / (1 + 10^((B − A) / 400))
change   = round(32 × (S − expected))      A gains it, B loses it
```

A single rounded change applied both ways creates no points. Ratings are provisional for the
first 10 games. The leaderboard lists the top 20 members with at least one rated game, ties
broken by games played, then name.

**Matchmaking.** _Find a match_ joins a queue. Every second the server pairs members whose
ratings are close enough for both: the accepted gap starts at 100 points and widens by 10 per
second waited, up to 800 (reached after 70 seconds). The closest pairs are matched first. A
member who stops polling for 30 seconds — a closed or hidden tab — leaves the queue. A pair
gets a table with no bots, and both screens move to it.

**Leaving.** If one player leaves a duel and a bot finishes it for them, they lose. If both
leave, the first to leave loses. If an account is deleted mid-duel, the duel is not rated.

## Data

| Table            | Holds                                                              |
| ---------------- | ------------------------------------------------------------------ |
| `daily_results`  | Each member's attempt per day: table, result, score, moves, reward |
| `ranked_ratings` | Rating and games played                                            |
| `ranked_matches` | Who sat where in each duel, and when they left                     |
| `ranked_history` | Every rated game: opponent's handle, result, change                |

All are deleted with the account and included in its export; a former opponent's history
keeps the deleted member's handle.

## Tuning

| What                                      | Where                                                         |
| ----------------------------------------- | ------------------------------------------------------------- |
| Time zone, secret                         | `DAILY_TIME_ZONE`, `DAILY_SALT` ([deployment](deployment.md)) |
| Bots, reward, ranking size, podium        | `apps/server/src/features/daily/`                             |
| Starting rating, K, provisional games     | `packages/meta/src/elo.ts`                                    |
| Gap, widening, cap, queue expiry and size | `apps/server/src/features/ranked/queue.ts`                    |
| Pairing interval, request limits          | `apps/server/src/features/ranked/index.ts`, `daily/index.ts`  |

Starting a challenge is limited to 10 times a minute, and joining or leaving the queue to 30;
test servers do not lift these.

## Extending

- **Ranked tables of more than two**: Elo is for duels; a multiplayer rating (TrueSkill,
  Glicko-2 per pair) would replace `elo.ts` and the pairing in `queue.ts`.
- **Leagues or seasons for ratings**: compute tiers from `ranked_ratings`; keep the rating
  itself continuous.

Endpoints: [HTTP API](api.md#daily-challenge-and-ranked-duels).
