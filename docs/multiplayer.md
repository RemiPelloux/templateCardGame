# Multiplayer

## Rooms

A room is a table: a five-character code (no `0/O/1/I`), a host, seats, lobby options, an
optional match and a **revision** bumped on every change (`apps/server/src/rooms`).

| File              | Role                                                            |
| ----------------- | --------------------------------------------------------------- |
| `model.ts`        | `Room`, `RoomSeat`, timings and limits                          |
| `lobby.ts`        | Pure room rules: join, seats, start, play, leave                |
| `room-service.ts` | Holds rooms; `update` → `commit` (revision, bots, save, events) |
| `room-bots.ts`    | Which bot must act, when, and its move                          |
| `room-view.ts`    | One member's `RoomView`, with the match through their seat only |
| `room-events.ts`  | Revision signals and the Server-Sent Events stream              |

Lifecycle: the creator sits first and hosts. People join until the table is full; the host adds
or removes bots, then deals. Someone who leaves the lobby frees the seat; someone who leaves a
live match is replaced by a bot under the same name. A leaving host passes the room to the next
person. A room closes when no person is left, or after two idle hours with no open stream.

## Live updates

`GET /api/rooms/:code/events` is a Server-Sent Events stream: `ready` at once, then
`room {"revision": n}` on each change (and when presence changes), with a keep-alive comment
every 20 s. It never carries room content. The client (`apps/web/src/net/useRoom.ts`) fetches
its own view on each event, ignores responses older than what it shows, and polls every 15 s as
a safety net in case a proxy holds the stream back. An open stream counts as "connected".

## Commands and revisions

`POST /api/rooms/:code/commands` with `{ revision, command }`. The server refuses with:

| Status | Code             | When                                         |
| ------ | ---------------- | -------------------------------------------- |
| 409    | `STALE_REVISION` | The room changed since the client's view     |
| 400    | `NOT_YOUR_TURN`  | The seat is not an actor                     |
| 400    | game codes       | The game's `RuleError` (`CANNOT_PLAY`, …)    |
| 403    | `FORBIDDEN`      | Not seated, or not the host for host actions |

## Bots

Bots are seats with `bot: '<id>'` and no player. After each commit, `scheduleBot` sets `botAt`
900 ms ahead if a bot must act; `RoomService.tick` (every 200 ms) plays one due move and commits
it, which schedules the next. A table of bots therefore plays at a human-readable pace, and
restarts resume where they stopped (`botAt` is saved with the room).

## Endpoints

| Method | Path                        | Body                                                            | Returns                  |
| ------ | --------------------------- | --------------------------------------------------------------- | ------------------------ |
| GET    | `/api/health`               |                                                                 | `{ ok, rooms, streams }` |
| GET    | `/api/session`              |                                                                 | `{ player }` or 401      |
| POST   | `/api/session`              | `{ name }`                                                      | `{ player }` + cookie    |
| DELETE | `/api/session`              |                                                                 | 204                      |
| POST   | `/api/rooms`                |                                                                 | `RoomView`               |
| GET    | `/api/rooms/:code`          |                                                                 | `RoomView`               |
| POST   | `/api/rooms/:code/join`     |                                                                 | `RoomView`               |
| POST   | `/api/rooms/:code/leave`    |                                                                 | 204                      |
| POST   | `/api/rooms/:code/seats`    | `{ action: 'addBot', bot? }` or `{ action: 'removeBot', seat }` | `RoomView`               |
| POST   | `/api/rooms/:code/start`    | `{ options? }`                                                  | `RoomView`               |
| POST   | `/api/rooms/:code/commands` | `{ revision, command }`                                         | `RoomView`               |
| GET    | `/api/rooms/:code/events`   |                                                                 | SSE stream               |

Errors are always `{ "error": { "code", "message" } }`. Types for every body live in
`packages/protocol`.

## HTTP hardening

Security headers and a strict CSP on every response, an origin check on writes (with
`SameSite=Lax` HttpOnly cookies this blocks cross-site requests), 64 KiB JSON bodies, per-IP
limits on session creation and per-player limits on writes, request timeouts, structured JSON
request logs, and a graceful shutdown that drains connections before closing the database.
