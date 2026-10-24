# Testing

Four kinds of tests, each proving something different. `pnpm verify` runs everything except
the browser tests; CI runs those too.

| Kind        | Proves                                                 | Run             |
| ----------- | ------------------------------------------------------ | --------------- |
| Unit        | Pure functions: engine, rules, metagame, translations  | `pnpm test`     |
| Conformance | Your rules keep the engine's contract over many games  | `pnpm test`     |
| Server      | Features, storage and HTTP behave, on a fresh database | `pnpm test`     |
| Browser     | The real app works end to end in Chromium              | `pnpm test:e2e` |

## Where tests live

| Folder                  | Covers                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------ |
| `packages/engine/tests` | RNG, matches, views, bots, replay, expansions, the harness itself (on a tiny fixture game) |
| `packages/game/tests`   | Each rule on hand-written positions, conformance, the Jokers expansion                     |
| `packages/meta/tests`   | Items, boosters, Elo, levels, missions, achievements                                       |
| `packages/i18n/tests`   | Placeholders, plurals, language negotiation                                                |
| `apps/server/tests`     | Accounts, economy, rooms, every feature, and HTTP round trips                              |
| `apps/web/tests`        | Every translation complete, expansions' text, PWA status                                   |
| `apps/web/e2e`          | Practice, accounts, tables, every page, friends, the daily deal, French                    |

Vitest collects `*.test.ts` under `packages/*/tests` and `apps/*/tests`.

## Server tests

Server tests build every service on an in-memory database with a clock the test moves by hand
(`apps/server/tests/support.ts`): no port, no waiting, no leftovers. Passwords use the cheap
test cost. HTTP tests start the real application on a free port and close it after each test.

## Conformance

`packages/game/tests/conformance.test.ts` plays 20 seeded games for every player count, with
random bots and with the basic bot, and checks at every position that legal moves apply, only
the right seats may act, cards are conserved, views keep secrets, and games end and replay
identically. A failure names its seed:

```text
crazy-eights: cards were lost or duplicated (players 4, seed 17, move 63)
```

Reproduce it with `simulate(game, { players: 4, seed: 17, bots: randomBot(), maxMoves: 63 })`
and step from there. A match reported from production is in the `matches` table: load it and
`replay(game, match)`.

## Browser tests

`pnpm test:e2e` builds the app and starts the production server on port 4317 with an
in-memory database, cheap passwords and relaxed limits; it never reuses a running server. It
runs Chromium with two workers. Specs share `e2e/support.ts`, whose `signUp` creates a fresh
account per test.

## Balance

Not a test, but run it when rules change:

```bash
pnpm sim --games 2000 --players 4                     # win rate per seat, game length
pnpm sim --players 2 --bot basic --rivals random      # does the bot beat random play?
pnpm sim --expansion jokers                           # with an expansion
```
