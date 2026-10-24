# Multiplayer

Tables run on the server. Players send moves with the revision they saw, the server applies
them with the game's rules, and every client is told that the table changed.

## Tables

A table (a _room_) has a five-character code (no `0`, `O`, `1` or `I`), a host, seats, lobby
options, an optional match and a **revision** that goes up on every change. It has a kind:

| Kind     | Opened by                    | Bots               | Options      |
| -------- | ---------------------------- | ------------------ | ------------ |
| `casual` | A member, from the home page | Host adds them     | Host chooses |
| `daily`  | The daily challenge          | Two, dealt with it | Fixed seed   |
| `ranked` | Matchmaking                  | None               | Fixed        |

Server tables (`daily`, `ranked`) are dealt at once by `rooms.openMatch({ kind, players, bots,
seed, options })`; nobody can change their seats or options.

Lifecycle of a casual table:

1. The creator sits first and hosts.
2. Members join with the code, until the table is full or the match has started.
3. The host adds or removes bots, picks options (an expansion they own), and deals.
4. Leaving the lobby frees the seat. Leaving a live match hands the seat to a bot, which keeps
   the name. A leaving host passes the table to the next person.
5. Once a match ends, the host may deal a rematch.

A table closes when no person is left at it, or when it has had no change and no open stream
for two hours. Any signed-in member who knows the code can watch a table; they see no hand.

## Revisions

Every move is sent as `{ revision, command }`. If the table changed since that revision, the
server answers `409 STALE_REVISION` and the client refreshes: a move is never applied to a
position its player did not see.

## Live updates

`GET /api/rooms/:code/events` is a Server-Sent Events stream:

- `retry: 3000`, then `ready` as soon as it opens;
- `room` with `{ "revision": n }` on every change, and when someone connects or disconnects;
- a `: ping` comment every 20 seconds, so proxies keep it open;
- revision `-1` when the table closes.

The stream never carries the table's content. On each `room` event the client
(`apps/web/src/features/rooms/useRoom.ts`) fetches its own view, ignores answers older than
what it shows, and also polls every 15 seconds in case a proxy holds the stream back. An open
stream counts its member as connected.

## Bots

A bot seat has a bot id (`basic` or `random`) and no player. After every change, if a bot must
act, the table schedules its move 900 ms later; a tick every 200 ms plays due moves. A table of
bots therefore plays at a pace people can follow, and a restart resumes where it stopped.

## Persistence

Each table is saved to SQLite on every change and restored at start-up. A finished match is
archived in `matches` with its seed, options and history, and announced to other features as
`match.finished` (progression, the daily challenge and ranked duels listen to it).

## Tuning

| Constant       | Value                     | File                                                         |
| -------------- | ------------------------- | ------------------------------------------------------------ |
| `BOT_DELAY_MS` | 900                       | `apps/server/src/features/rooms/model.ts`                    |
| `PRESENCE_MS`  | 20 s                      | same: a member counts as connected this long after a request |
| `ROOM_IDLE_MS` | 2 h                       | same                                                         |
| `MAX_ROOMS`    | 500                       | same: beyond it, `503 BUSY`                                  |
| Writes         | 240 per minute per member | `apps/server/src/features/rooms/routes.ts`                   |
| Keep-alive     | 20 s                      | `apps/server/src/features/rooms/room-events.ts`              |
| Client polling | 15 s                      | `apps/web/src/features/rooms/useRoom.ts`                     |

## Extending

- Other features add panels to the lobby or under a finished match through
  `apps/web/src/features/rooms/slots.ts`.
- A feature can check lobby options before they are applied with `rooms.guardOptions(guard)`;
  the expansion feature uses it to refuse an expansion the host does not own.
- Endpoints are listed in the [HTTP API](api.md#rooms).
