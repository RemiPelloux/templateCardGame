# HTTP API

Every endpoint the server answers. Types are in `packages/protocol/src/`; a type named below
is exported from there.

## Conventions

- **JSON in, JSON out.** Bodies are JSON objects of at most 64 KiB, sent with
  `Content-Type: application/json`.
- **Sessions.** Signing in sets the `cg_session` cookie. Endpoints marked _member_ answer
  `401 NO_SESSION` without it.
- **Origin.** Requests other than `GET` from another site are refused with `403 FORBIDDEN`.
- **Empty answers** are `204 No Content`.
- **Errors** have one shape: `{ "error": { "code", "message", "params"? } }`. Show the
  translation of `code` ([translations](i18n.md#errors)); `message` is an English fallback.
- **Rate limits** count requests per minute and answer `429 RATE_LIMITED` beyond. Test servers
  started with `RELAXED_LIMITS=1` lift them, except where noted.

Codes any endpoint may return:

| Code                | Status    | When                                                                           |
| ------------------- | --------- | ------------------------------------------------------------------------------ |
| `NOT_FOUND`         | 404       | Unknown endpoint, or a table that no longer exists                             |
| `NO_SESSION`        | 401       | A member endpoint without a valid session                                      |
| `FORBIDDEN`         | 403       | Not allowed: wrong site, not the host, not seated                              |
| `INVALID_INPUT`     | 400       | A body or field of the wrong shape                                             |
| `INVALID_JSON`      | 400       | A body that is not JSON                                                        |
| `UNSUPPORTED_MEDIA` | 415       | A body that is not `application/json`                                          |
| `TOO_LARGE`         | 413       | A body over 64 KiB                                                             |
| `RATE_LIMITED`      | 429       | Over a per-minute budget                                                       |
| `BUSY`              | 429 / 503 | Too many clients tracked, too many tables, or too many password checks at once |
| `INTERNAL`          | 500       | A bug; it is logged and never described to the client                          |

## Health

| Method | Path          | Auth | Answer                   |
| ------ | ------------- | ---- | ------------------------ |
| GET    | `/api/health` | —    | `{ ok, rooms, streams }` |

## Accounts

| Method | Path                            | Auth   | Body → answer                                                                    | Errors                                                        |
| ------ | ------------------------------- | ------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| GET    | `/api/session`                  | member | → `SessionResponse` `{ player, locale }`                                         |                                                               |
| GET    | `/api/auth/available/:username` | —      | → `{ available }`                                                                | `INVALID_USERNAME`                                            |
| POST   | `/api/auth/register`            | —      | `{ username, password }` → `RegisterResponse` (session and eight recovery codes) | `INVALID_USERNAME`, `INVALID_PASSWORD`, `USERNAME_TAKEN` 409  |
| POST   | `/api/auth/login`               | —      | `{ username, password }` → `SessionResponse`                                     | `WRONG_CREDENTIALS` 401, `TOO_MANY_ATTEMPTS` 429              |
| POST   | `/api/auth/recover`             | —      | `{ username, code, password }` → `SessionResponse`                               | `INVALID_PASSWORD`, `WRONG_RECOVERY` 401, `TOO_MANY_ATTEMPTS` |
| POST   | `/api/auth/logout`              | —      | → 204                                                                            |                                                               |
| GET    | `/api/account`                  | member | → `AccountOverview` (player, creation date, recovery codes left, devices)        |                                                               |
| POST   | `/api/account/password`         | member | `{ current, next }` → 204                                                        | `INVALID_PASSWORD`, `WRONG_PASSWORD` 403, `TOO_MANY_ATTEMPTS` |
| POST   | `/api/account/locale`           | member | `{ locale }` → 204                                                               | `INVALID_LOCALE`                                              |
| POST   | `/api/account/recovery-codes`   | member | `{ password }` → `{ codes }`                                                     | `WRONG_PASSWORD`, `TOO_MANY_ATTEMPTS`                         |
| DELETE | `/api/account/sessions/:id`     | member | → 204                                                                            |                                                               |
| POST   | `/api/account/delete`           | member | `{ password }` → 204                                                             | `WRONG_PASSWORD`, `TOO_MANY_ATTEMPTS`                         |
| GET    | `/api/account/export`           | member | → every feature's data for the member                                            |                                                               |

Limits per address: 5 sign-ups, 30 sign-ins and recoveries together, 120 availability checks.
[Accounts](accounts.md) describes the attempt counters per username.

## Economy

| Method | Path                   | Auth   | Body → answer                            | Errors                          |
| ------ | ---------------------- | ------ | ---------------------------------------- | ------------------------------- |
| GET    | `/api/wallet`          | member | → `{ coins }`                            |                                 |
| GET    | `/api/inventory`       | member | → `{ owned, equipped }`                  |                                 |
| POST   | `/api/inventory/equip` | member | `{ slot, item }` → `{ owned, equipped }` | `INVALID_ITEM`, `NOT_OWNED` 403 |

## Rooms

All rooms endpoints need a member. Writes count against 240 per minute per member.

| Method | Path                        | Body → answer                                                                | Errors                                                                                                  |
| ------ | --------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| GET    | `/api/rooms/mine`           | → `[{ code, kind }]`, newest first                                           |                                                                                                         |
| POST   | `/api/rooms`                | → `RoomView` of a new casual table                                           | `BUSY` 503                                                                                              |
| GET    | `/api/rooms/:code`          | → `RoomView` (as a spectator if not seated)                                  | `NOT_FOUND`                                                                                             |
| POST   | `/api/rooms/:code/join`     | → `RoomView`                                                                 | `MATCH_STARTED`, `ROOM_FULL`                                                                            |
| POST   | `/api/rooms/:code/leave`    | → 204                                                                        |                                                                                                         |
| POST   | `/api/rooms/:code/seats`    | `{ action: 'addBot', bot? }` or `{ action: 'removeBot', seat }` → `RoomView` | `FORBIDDEN`, `MATCH_STARTED`, `UNKNOWN_BOT`, `ROOM_FULL`, `NOT_A_BOT`                                   |
| POST   | `/api/rooms/:code/options`  | `{ options }` → `RoomView`                                                   | `FORBIDDEN`, `MATCH_STARTED`, `EXPANSION_NOT_OWNED` 403, the game's option errors                       |
| POST   | `/api/rooms/:code/start`    | `{ options? }` → `RoomView`                                                  | as above, plus `PLAYER_COUNT`                                                                           |
| POST   | `/api/rooms/:code/commands` | `{ revision, command }` → `RoomView`                                         | `FORBIDDEN`, `NOT_STARTED`, `STALE_REVISION` 409, `MATCH_OVER`, `NOT_YOUR_TURN`, the game's rule errors |
| GET    | `/api/rooms/:code/events`   | Server-Sent Events, see [multiplayer](multiplayer.md#live-updates)           | `NOT_FOUND`                                                                                             |

## Expansions

| Method | Path              | Auth     | Answer                                 |
| ------ | ----------------- | -------- | -------------------------------------- |
| GET    | `/api/expansions` | optional | `ExpansionCatalog`; guests own nothing |

## Shop

Purchases count against 30 per minute per member.

| Method | Path                      | Body → answer                                  | Errors                                                                                              |
| ------ | ------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| GET    | `/api/shop`               | → `ShopView` (coins, items for sale, boosters) |                                                                                                     |
| POST   | `/api/shop/buy`           | `{ item, request? }` → `{ coins, inventory }`  | `UNKNOWN_ITEM` 404, `NOT_FOR_SALE`, `ALREADY_OWNED` 409, `INSUFFICIENT_COINS`, `REQUEST_REUSED` 409 |
| POST   | `/api/shop/boosters/open` | `{ booster, request? }` → `OpeningResponse`    | `UNKNOWN_BOOSTER` 404, `INSUFFICIENT_COINS`, `REQUEST_REUSED` 409                                   |

## Progression and profiles

| Method | Path                                  | Answer                                             | Errors                                                                     |
| ------ | ------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------- |
| GET    | `/api/progression`                    | `ProgressionView`                                  |                                                                            |
| POST   | `/api/progression/missions/:id/claim` | `{ progression, coins, xp }`                       | `MISSION_UNAVAILABLE` 404, `MISSION_CLAIMED` 409, `MISSION_INCOMPLETE` 409 |
| GET    | `/api/progression/result/:room`       | `ResultSummary` of your last match there           | `NOT_FOUND` until it exists                                                |
| GET    | `/api/profile`                        | Your `ProfileView`                                 |                                                                            |
| GET    | `/api/profile/:handle`                | A member's `ProfileView`; `ada-1234` or `ada#1234` | `PROFILE_NOT_FOUND` 404                                                    |

All need a member.

## Social

All need a member. Writes count against 60 per minute; friend requests also against 10, and
invites against 20, per minute.

| Method | Path                           | Body → answer                                | Errors                                                                                                                                                        |
| ------ | ------------------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/social`                  | → `SocialOverview`                           |                                                                                                                                                               |
| POST   | `/api/social/presence`         | → `{ requests, invites }` (not rate limited) |                                                                                                                                                               |
| POST   | `/api/social/settings`         | `{ appearOffline }` → `SocialOverview`       |                                                                                                                                                               |
| POST   | `/api/social/requests`         | `{ handle }` → `SocialOverview`              | `UNKNOWN_PLAYER` 404, `SELF_TARGET`, `PLAYER_BLOCKED` 409, `CANNOT_REQUEST` 403, `ALREADY_FRIENDS` 409, `PENDING_LIMIT`, `FRIEND_LIMIT`, `THEIR_FRIEND_LIMIT` |
| POST   | `/api/social/requests/accept`  | `{ handle }` → `SocialOverview`              | `NO_REQUEST` 409, `FRIEND_LIMIT`, `THEIR_FRIEND_LIMIT`                                                                                                        |
| POST   | `/api/social/requests/decline` | `{ handle }` → `SocialOverview`              |                                                                                                                                                               |
| POST   | `/api/social/requests/cancel`  | `{ handle }` → `SocialOverview`              |                                                                                                                                                               |
| POST   | `/api/social/friends/remove`   | `{ handle }` → `SocialOverview`              |                                                                                                                                                               |
| POST   | `/api/social/blocks`           | `{ handle }` → `SocialOverview`              | `BLOCK_LIMIT`                                                                                                                                                 |
| POST   | `/api/social/blocks/remove`    | `{ handle }` → `SocialOverview`              |                                                                                                                                                               |
| POST   | `/api/social/invites`          | `{ handle, room }` → 204                     | `NOT_FRIENDS` 403, `NOT_AT_TABLE` 403, `CANNOT_INVITE` 403, `ALREADY_AT_TABLE` 409                                                                            |
| POST   | `/api/social/invites/dismiss`  | `{ id }` → `SocialOverview`                  |                                                                                                                                                               |
| POST   | `/api/social/reports`          | `{ handle, reason, note?, room? }` → 204     | `INVALID_REASON`, `NOTE_TOO_LONG`, `INVALID_ROOM`, `REPORT_LIMIT` 429 (20 per 24 h)                                                                           |

Endpoints taking a `handle` may also answer `UNKNOWN_PLAYER` and `SELF_TARGET`.

## Daily challenge and ranked duels

All need a member. These budgets apply even with `RELAXED_LIMITS`.

| Method | Path                | Body → answer                                      | Errors / limit                              |
| ------ | ------------------- | -------------------------------------------------- | ------------------------------------------- |
| GET    | `/api/daily`        | → `DailyView`                                      |                                             |
| POST   | `/api/daily/start`  | → `{ room }`                                       | `DAILY_DONE` 409, `BUSY` 503; 10 per minute |
| GET    | `/api/ranked`       | → `RankedView` (polling it keeps you in the queue) |                                             |
| POST   | `/api/ranked/queue` | → `RankedQueueStatus`                              | 30 per minute, shared with leaving          |
| DELETE | `/api/ranked/queue` | → `RankedQueueStatus`                              |                                             |

## Telemetry

| Method | Path             | Auth | Body → answer                   | Errors / limit                                     |
| ------ | ---------------- | ---- | ------------------------------- | -------------------------------------------------- |
| POST   | `/api/telemetry` | —    | `{ events }` (40 at most) → 204 | `INVALID_INPUT`; 12 batches per minute per address |

## Game errors

Moves and options are refused by the engine and the game with these codes (status 400):

| Source | Codes                                                                                                                      |
| ------ | -------------------------------------------------------------------------------------------------------------------------- |
| Engine | `PLAYER_COUNT`, `MATCH_OVER`, `NOT_YOUR_TURN`, `CARD_NOT_FOUND`, `INVALID_INPUT`, `UNKNOWN_EXPANSION`, `EXPANSION_VERSION` |
| Game   | `CANNOT_PLAY`, `SUIT_REQUIRED`, `ALREADY_DRAWN`, `NOTHING_TO_DRAW`, `MUST_DRAW`                                            |
