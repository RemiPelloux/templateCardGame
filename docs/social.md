# Social

Friends, presence, table invites, blocks and reports. Server: `apps/server/src/features/social`;
web: `apps/web/src/features/friends`; wire types: `packages/protocol/src/social.ts`.

## Model

Members find each other by **handle** (`name#tag`, e.g. `ada#1234`). The API names other
members only by handle: account ids never leave the server.

| Table             | Holds                                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| `friendships`     | One row per direction (`account_id`, `friend_id`, `since`)               |
| `friend_requests` | Pending requests (`from_id`, `to_id`, `created`)                         |
| `blocks`          | Who blocked whom                                                         |
| `presence`        | `last_seen` from the app's ping, and the "appear offline" setting        |
| `table_invites`   | Inviter, invitee, room code, expiry; one per inviter, invitee and room   |
| `reports`         | Reporter, target, reason, optional note and room code, day, time created |

- **Friends**: a request waits until the other side accepts, declines, or the sender cancels.
  Sending a request to someone who already asked you accepts theirs. Removing a friend also
  withdraws table invites between the two.
- **Presence**: the web pings `POST /api/social/presence` every 30 s from every page while the
  tab is visible (the shell mounts it, so tables count too). A friend is `online` within two
  minutes of a ping, `playing` if also seated at a table (which table stays private), otherwise
  `offline`. "Appear offline" shows you offline to everyone. The ping is a single small write;
  nothing is added to other requests.
- **Table invites**: a member seated at a **casual** table can invite a friend who is not seated
  there. An invite lasts 15 minutes and disappears earlier if the inviter leaves the table or the
  invitee sits down. Accepting is joining: the web calls `POST /api/rooms/:code/join` and opens
  the table, so the rooms rules (full table, match dealt) still apply.
- **Blocks**: blocking ends the friendship and cancels pending requests and invites **both
  ways**. While a block lasts, neither side can send the other a request or an invite, and since
  they are no longer friends neither sees the other's presence. The blocked member is never told:
  their requests fail with the same `CANNOT_REQUEST` as a full inbox.

## Limits

All in `apps/server/src/features/social/limits.ts`.

| Limit                     | Value       | Refusal                                     |
| ------------------------- | ----------- | ------------------------------------------- |
| Friends per member        | 200         | `FRIEND_LIMIT` / `THEIR_FRIEND_LIMIT` (409) |
| Outgoing pending requests | 50          | `PENDING_LIMIT` (409)                       |
| Incoming pending requests | 100         | `CANNOT_REQUEST` (403)                      |
| Blocks per member         | 500         | `BLOCK_LIMIT` (409)                         |
| Social writes             | 60 / minute | `RATE_LIMITED` (429)                        |
| Friend requests by handle | 10 / minute | `RATE_LIMITED` (429)                        |
| Table invites             | 20 / minute | `RATE_LIMITED` (429)                        |
| Reports filed             | 20 / 24 h   | `REPORT_LIMIT` (429)                        |
| Report note               | 280 chars   | `NOTE_TOO_LONG` (400)                       |
| Invite lifetime           | 15 minutes  | (expired invites are swept every minute)    |

Test servers (`RELAXED_LIMITS=1`) lift the per-minute budgets.

## Endpoints

Every endpoint needs a signed-in member. Writes that change the lists answer with the fresh
`SocialOverview`, which the web writes straight into its cache.

| Method | Path                           | Body                               | Returns          |
| ------ | ------------------------------ | ---------------------------------- | ---------------- |
| GET    | `/api/social`                  |                                    | `SocialOverview` |
| POST   | `/api/social/presence`         |                                    | `SocialPulse`    |
| POST   | `/api/social/settings`         | `{ appearOffline }`                | `SocialOverview` |
| POST   | `/api/social/requests`         | `{ handle }`                       | `SocialOverview` |
| POST   | `/api/social/requests/accept`  | `{ handle }`                       | `SocialOverview` |
| POST   | `/api/social/requests/decline` | `{ handle }`                       | `SocialOverview` |
| POST   | `/api/social/requests/cancel`  | `{ handle }`                       | `SocialOverview` |
| POST   | `/api/social/friends/remove`   | `{ handle }`                       | `SocialOverview` |
| POST   | `/api/social/blocks`           | `{ handle }`                       | `SocialOverview` |
| POST   | `/api/social/blocks/remove`    | `{ handle }`                       | `SocialOverview` |
| POST   | `/api/social/invites`          | `{ handle, room }`                 | 204              |
| POST   | `/api/social/invites/dismiss`  | `{ id }`                           | `SocialOverview` |
| POST   | `/api/social/reports`          | `{ handle, reason, note?, room? }` | 204              |

Report reasons: `cheating`, `harassment`, `offensive-name`, `spam`, `other`.

## Privacy

- Other members appear as `{ name, tag }` only; never their id, sessions, devices or address.
- Presence is computed only for friends, and only as online / at a table / offline.
- A reported member is never told about the report; a reporter who repeats the same report the
  same day gets the same success, and only one row is stored.
- **Account deletion**: friendships, requests, blocks, presence and invites cascade away
  (`ON DELETE CASCADE`). Reports are kept for moderation with the deleted side set to `NULL`
  (`ON DELETE SET NULL`): the report survives, the person is no longer identifiable from it.
  Notes are free text written by the reporter and are kept as written.
- **Export** (`GET /api/account/export`, key `social`): your friends, requests both ways, blocks,
  invites received, settings and the reports you filed (reason, note, room, date, without the
  target). Reports about you are not exported.

## Moderation

Reports are read on the server with a read-only script:

```sh
DB_PATH=data/game.sqlite node scripts/ops/list-reports.mjs            # last 7 days, 100 rows
DB_PATH=data/game.sqlite node scripts/ops/list-reports.mjs --days 30 --limit 500
```

It prints the newest reports first with the reporter and target as handles (`(deleted)` for a
deleted account), the reason, room code and note. Run it from the repository on the host (or
inside the container) against the live file; it opens the database read-only, so it is safe
while the server runs.

A suggested routine: review new reports daily; look for several reporters naming the same
target; for a table code, check the archived match in `matches` (`room` column) to replay it;
then decide and keep a note of the decision outside the database. The template ships no
sanctions or moderator tools yet: acting on an account is up to your own operations.
