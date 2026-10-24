# Social

Members add friends by handle, see who is around, invite friends to their table, block people
they do not want to hear from, and report bad behaviour for moderation.

## How it works

**Privacy.** Other members only ever appear as a handle (`name#1234`) and a name. Account ids,
devices and sessions never reach another member's browser.

**Friends.** A request goes to a handle. If that member had already asked you, it becomes a
friendship at once. Requests can be accepted, declined or cancelled, and friends removed, from
either side.

**Presence.** Every page pings the server every 30 seconds. Friends see each other as:

| State      | When                                                    |
| ---------- | ------------------------------------------------------- |
| online     | Seen in the last two minutes                            |
| at a table | Online and seated at any table (which one is not shown) |
| offline    | Not seen for two minutes, or chose _Appear offline_     |

**Table invites.** A member seated at a casual table may invite a friend who is not already
seated there. Inviting the same friend again renews the invitation. An invitation lasts 15
minutes and is hidden once the inviter has left the table or the friend has sat down; _Join_
opens the table. The lobby lists online friends with an _Invite_ button.

**Blocks.** Blocking ends the friendship and cancels requests and invitations both ways. While
it lasts, the blocker who tries to send a request is told `PLAYER_BLOCKED`; the blocked member
gets `CANNOT_REQUEST`, the same answer as a full inbox, so the block is never revealed. A
blocked member sees the blocker as offline. Blocks do not affect tables joined by code or
profiles.

**Reports.** A report names a handle and a reason — `cheating`, `harassment`,
`offensive-name`, `spam` or `other` — with an optional note (280 characters) and table code.
The same reporter, target and reason count once per UTC day: a repeat succeeds but stores
nothing. A member files at most 20 reports per 24 hours.

## Limits

| Limit                      | Value           |
| -------------------------- | --------------- |
| Friends                    | 200             |
| Requests sent, pending     | 50              |
| Requests received, pending | 100             |
| Blocks                     | 500             |
| Social writes              | 60 per minute   |
| Friend requests            | 10 per minute   |
| Invitations                | 20 per minute   |
| Reports                    | 20 per 24 hours |

All in `apps/server/src/features/social/limits.ts`. Test servers (`RELAXED_LIMITS=1`) lift
the per-minute budgets, not the report limit.

## Moderation

```bash
node scripts/ops/list-reports.mjs [--days 7] [--limit 100]
```

prints recent reports, newest first: date, reporter, target, reason, table, note. It reads the
server's database (`data/game.sqlite`; set `DB_PATH` for another file). When a report names a
table, the finished match is in `matches` (look it up by `room` and the date, since codes are
reused over time) and can be replayed exactly.

There is no automatic sanction: moderators decide, for instance by deleting an account.

## Data and deletion

| Table             | Holds                                                |
| ----------------- | ---------------------------------------------------- |
| `friendships`     | Both directions of each friendship                   |
| `friend_requests` | Pending requests                                     |
| `blocks`          | Who blocked whom                                     |
| `presence`        | Last ping and the _Appear offline_ setting           |
| `table_invites`   | Invitations and their expiry                         |
| `reports`         | Reports, unique per reporter, target, reason and day |

Everything is deleted with the account except reports, which are kept for moderation with the
deleted side cleared (shown as "(deleted)"). The export contains the member's friends,
requests, blocks, invitations received, settings and the reports they filed, without whom
they reported.

## Extending

- A new report reason: add it to `REPORT_REASONS` in `packages/protocol/src/social.ts` and
  translate it in `apps/web/src/features/friends/i18n.ts`.
- Realtime presence: the 30-second ping keeps the server simple; a stream like the tables'
  would make it instant.

Endpoints: [HTTP API](api.md#social).
