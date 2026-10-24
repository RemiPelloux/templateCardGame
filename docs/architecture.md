# Architecture

How the packages fit together, how a move travels from a click to every player, and who may
see what.

## Packages and layers

```text
          engine            i18n            (import nothing)
            ▲  ▲
         game  meta                         (import engine)
            ▲  ▲   ▲ i18n
            protocol                        (types shared by server and client)
            ▲      ▲
        server    web                       (import every shared package)
```

| Package    | Holds                                                            | May import                                                            |
| ---------- | ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| `engine`   | Matches, seeded RNG, views, bots, simulation, replay, expansions | nothing                                                               |
| `i18n`     | Translator, plural rules, locales, typed bundles                 | nothing                                                               |
| `game`     | Your rules (Crazy Eights) and their expansions                   | engine                                                                |
| `meta`     | Items, boosters, levels, rewards, missions, achievements, Elo    | engine                                                                |
| `protocol` | Routes, request and response types, error body                   | engine, game, i18n, meta                                              |
| `server`   | HTTP server, one module per feature, SQLite                      | the five above, Node, `better-sqlite3`, `sirv`, `vite`                |
| `web`      | React client, one folder per feature                             | the five above, React, TanStack Query, `web-vitals`, the PWA register |

Two mechanisms enforce the layers. The five shared packages compile with `lib: ES2022` and no
ambient types, so `window`, `fetch`, `setTimeout` or `process` are compile errors in them.
`pnpm lint:boundaries` (`scripts/check-boundaries.mjs`) fails on any import a layer may not
make. The single exception is development tooling: `apps/web/vite.config.ts` loads the
server's Vite plugin so `pnpm dev` serves the real API.

Packages export their TypeScript source (`"exports": "./src/index.ts"`); there is no package
build. Vite bundles them for the browser and `tsx` runs them on the server.

## A move's journey

Online:

1. The player clicks a card. The board calls `controller.send({ type: 'play', cardId })`.
2. `useRoom` posts `{ revision, command }` to `POST /api/rooms/:code/commands`.
3. The server resolves the session cookie to a player, checks the request's origin and the
   member's write budget, and reads the body's shape (`features/rooms/requests.ts`).
4. The room checks the player is seated and the revision is current; a stale one gets
   `409 STALE_REVISION`. Then it calls the engine's `act`.
5. `act` checks the match is live and the seat may act, has the game parse the command, and
   applies it to a copy of the state. A refused move throws a `RuleError` and changes nothing.
6. The room commits: it bumps its revision, schedules a bot if one must act, saves itself to
   SQLite, and, if the move ended the match, archives it and announces `match.finished`.
7. The sender receives their new view. Every other client gets "revision n" on its live
   stream and fetches its own view.

Practice runs steps 5 to 7 in the browser (`features/practice/useLocalMatch.ts`): the match is
kept in `localStorage`, bots move after 700 ms, and nothing is earned. The full state lives in
the browser, so practice is not cheat-proof; online tables are.

## Authority and privacy

- **The server decides.** Clients send commands, never state. Every rule is checked in the
  game's `apply`; the UI only reads `view.legal` to know what is clickable.
- **Views are the only way out.** A client receives `viewMatch(game, match, seat)`: the game's
  `view` for that seat, the commands that seat may send, and the log entries it may see.
  Other hands, the deck order, the seed and the RNG state never leave the server.
- **Live updates carry no content.** The stream only says "revision n"; each client then asks
  for its own view, so there is one single door to private information.
- **Bots play by the same rules.** They receive their seat's view, never the state, and draw
  their randomness from the match seed, so a match replays exactly.
- **Watching is allowed.** Any signed-in member who knows a table's code can open it and sees
  what a spectator may see: no hand at all.

## Determinism

All randomness goes through the match's RNG (`ctx.rng`, Mulberry32, its state stored in the
match). The seed, the options and the command history rebuild a match exactly: `replay` does
it, and `checkConformance` proves it for thousands of seeded games. Use it to reproduce a bug
report or to audit a result: finished matches are archived with their history.

## The server

`apps/server/src/` holds `core/` (configuration, database, events, HTTP plumbing) and one
folder per feature in `features/`, registered in `features/index.ts`:

```text
accounts → economy → rooms → dlc → profile → progression → shop → social → daily → ranked → telemetry
```

Each feature exports a `Feature`: its migrations, an optional `start` (subscribe to events),
`routes`, `tick` (background work every 200 ms) and `exportData` (its part of a member's data
export). Features share a `Services` object (database, clock, configuration, events, rate
limiters, accounts, wallet, inventory, rooms) and never import each other's folders. They
talk through three events: `account.created`, `account.deleted` and `match.finished`.
[Adding a feature](features.md) has the details.

## The client

`apps/web/src/` holds the app shell (`app/`), shared UI (`ui/`), translations (`i18n/`), the
generic table (`table/`), the game's own board (`game/`) and one folder per feature in
`features/`. Registries keep features apart:

| Registry                   | Lists                                                   |
| -------------------------- | ------------------------------------------------------- |
| `app/screens.tsx`          | Every page (loaded on demand) and which need an account |
| `app/nav.ts`               | The header links and the phone tab bar                  |
| `i18n/messages.ts`         | Every translation bundle                                |
| `features/rooms/slots.ts`  | Panels other features add to the lobby and to results   |
| `game/expansions/index.ts` | How each expansion's cards and text are shown           |

Server state goes through one TanStack Query cache (`app/query.ts`), so every screen that
reads the wallet or the friends list shares one request.

## Persistence

SQLite in WAL mode with foreign keys on. Each feature declares migrations with permanent ids
(`rooms.1-tables`); they run once, in registry order, and are recorded in the `migrations`
table. Tables that belong to a member reference `accounts(id) ON DELETE CASCADE`, so deleting
an account removes its data.

Rooms live in memory and are saved on every change, so a restart resumes every table. Finished
matches are archived in `matches` with their seed, options and history.

## Limits of the design

One server process holds every open room, up to 500. That serves a large community on one
machine. Running several processes would need a shared store for rooms and a message bus for
live updates (Redis pub/sub, Postgres `LISTEN/NOTIFY`).

## Where to extend

| You want                 | Start from                                                                |
| ------------------------ | ------------------------------------------------------------------------- |
| A turn clock             | A deadline on the room checked in `RoomService.tick`, then `playBot`      |
| Several games in one app | A registry of definitions keyed by `match.game`, picked in the lobby      |
| Simultaneous turns       | Return several seats from `actors`; the engine and bots already handle it |
| Another way to sign in   | Replace `features/accounts`; the rest only needs a `Player`               |
| Another language         | One line in `LOCALES`, then the translations the compiler asks for        |
