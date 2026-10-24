# Testing

| Layer       | Where                                     | Proves                                        | Run             |
| ----------- | ----------------------------------------- | --------------------------------------------- | --------------- |
| Engine      | `packages/engine/tests`                   | RNG, matches, views, bots, replay, harness    | `pnpm test`     |
| Rules       | `packages/game/tests/rules.test.ts`       | Each rule of RULES.md on a hand-made position | `pnpm test`     |
| Conformance | `packages/game/tests/conformance.test.ts` | Hundreds of seeded games keep the contract    | `pnpm test`     |
| Server      | `apps/server/tests`                       | Rooms, bots, persistence, sessions, real HTTP | `pnpm test`     |
| Browser     | `apps/web/e2e`                            | Practice and online flows in Chromium         | `pnpm test:e2e` |
| Balance     | `scripts/simulate.ts`                     | Win rates and game length between bots        | `pnpm sim`      |

Unit and HTTP tests use in-memory SQLite and a clock the test moves by hand
(`apps/server/tests/support.ts`), so they need no server, port or delay. The HTTP tests start
the real application on an ephemeral port and close it after each test.

`pnpm test:e2e` builds the app and serves it on port **4317** with an in-memory database; it
never reuses a running dev server. It runs one Chromium project with two workers; add
projects in `apps/web/playwright.config.ts` when you need more coverage.

## Reproducing a failure

A conformance failure names its seed:

```text
crazy-eights: cards were lost or duplicated (players 4, seed 17, move 63)
```

Replay it in a test with `simulate(game, { players: 4, seed: 17, bots: randomBot(), maxMoves: 63 })`
and step from there. For a match reported in production, load its row from the `matches`
table and call `replay(game, match)`.
