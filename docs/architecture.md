# Architecture

## Layers

```text
            ┌──────────────┐
            │   engine     │  pure kernel, knows no game
            └──────▲───────┘
            ┌──────┴───────┐
            │    game      │  your rules: a GameDefinition
            └──────▲───────┘
            ┌──────┴───────┐
            │   protocol   │  routes, requests, RoomView
            └──▲────────▲──┘
     ┌─────────┴──┐  ┌──┴─────────┐
     │   server   │  │    web     │
     └────────────┘  └────────────┘
```

| Package    | May import                    | Never                               |
| ---------- | ----------------------------- | ----------------------------------- |
| `engine`   | nothing                       | DOM, Node, timers, I/O              |
| `game`     | engine                        | DOM, Node, the apps                 |
| `protocol` | engine, game (types)          | the apps                            |
| `server`   | engine, game, protocol, Node  | web, React                          |
| `web`      | engine, game, protocol, React | server (except Vite's plugin), Node |

Two mechanisms enforce this. `engine`, `game` and `protocol` compile with `types: []` and
`lib: ES2022`, so `window`, `fetch`, `setTimeout` or `process` are compile errors there. And
`pnpm lint:boundaries` (`scripts/check-boundaries.mjs`) fails on any forbidden import.

Workspace packages export their TypeScript source directly (`"exports": "./src/index.ts"`):
there is no package build step. Vite bundles them for the browser and `tsx` runs them on the
server.

## A command's journey

Online:

1. The player clicks a card. The board calls `controller.send({ type: 'play', cardId })`.
2. `useRoom` posts `{ revision, command }` to `POST /api/rooms/:code/commands`.
3. The router resolves the session cookie to a `Player`, checks the origin and the rate limit,
   and reads the body's shape (`api/requests.ts`).
4. `RoomService.play` → `lobby.play` checks that the player is seated and that the revision is
   current (`409 STALE_REVISION` otherwise), then calls the engine's `act`.
5. `act` checks the match is live and the seat is an actor, runs the game's `parseCommand`,
   then `apply` on a copy of the state. A `RuleError` leaves the room exactly as it was.
6. `commit` bumps the room revision, schedules a bot if one must act, saves the room to SQLite,
   archives the match if this move ended it, and emits `revision n` to live listeners.
7. The response is the sender's new `RoomView`. Every other client receives `room` on its
   event stream and fetches its own view.

Offline practice runs steps 5 and 7 in the browser (`play/useLocalMatch.ts`), with bots on a
timer. It is meant for practice: the full state lives in the browser, so it is not cheat-proof.

## Authority and privacy

- **The server is the only authority.** Clients never send state, only commands. Every rule is
  checked in `apply`, never only in the UI.
- **Views are the only way out.** A client only ever receives `viewMatch(def, match, seat)`:
  the game's `view(state, seat)`, the commands that seat may send, and the log entries it may
  see (`visibleTo`). The RNG state, the seed, the deck order and other hands stay on the server.
- **Live events carry no content.** The SSE stream only says "revision n". Each client then
  fetches its own projected view, so there is a single door to private information.
- **Bots are players.** They receive their seat's view, never the raw state
  (`engine/bots.ts`), and are deterministic given the match seed.
- **Revisions prevent stale moves.** A command based on an older revision is refused rather
  than applied to a position the player never saw.

## Determinism

All randomness goes through the match's RNG (`ctx.rng`, Mulberry32, state stored in the match).
Given the seed, options and command history, `replay` rebuilds a match bit for bit. Uses:
reproducing a bug report, auditing a result, verifying saves, regression tests from real games.
Bots derive their own RNG from `(seed, version, seat)` so their choices never disturb the deck.

## Persistence

SQLite in WAL mode (`apps/server/src/storage`). Migrations are an append-only list applied at
start-up and recorded in `schema_version`.

| Table      | Holds                                                            |
| ---------- | ---------------------------------------------------------------- |
| `sessions` | Hash of each guest token, player id, name, last seen             |
| `rooms`    | Every open room as JSON, saved on every change, restored at boot |
| `matches`  | Each finished match with seed, options and history (replayable)  |

Rooms live in memory and are saved on each change, so the server runs as a **single
instance**. Scaling out needs a shared store for rooms and a bus for `RoomEvents` (Redis
pub/sub, Postgres `LISTEN/NOTIFY`).

## Extending

Where the features left out of the template would plug in:

| Feature                  | Where                                                                      |
| ------------------------ | -------------------------------------------------------------------------- |
| Accounts and passwords   | Replace `identity/sessions.ts`; routes only need a `Player`                |
| Turn clock / AFK         | A deadline on `Room` checked in `RoomService.tick`, then `playBot`         |
| Rankings / Elo           | Read the `matches` archive; compute in a new `server/src/ranking`          |
| Several games in one app | A registry of definitions keyed by `match.game`, picked in the lobby       |
| Spectators               | `roomView` already projects with `seat = null`; allow it in `view`         |
| Simultaneous turns       | Return several seats from `actors`; the engine and bots handle it          |
| Translations             | Log entries are `{ event, data }`; translate in `web/src/game/describe.ts` |
| PWA / offline install    | Add `vite-plugin-pwa`; practice already works without the server           |
