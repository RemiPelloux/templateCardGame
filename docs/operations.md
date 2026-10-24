# Operations

What the running app tells you about itself — anonymous measurements from players' browsers,
a log of server errors, alerts — and how the installable app updates.

## Telemetry

**What is collected.** Once the page is idle, the client loads `web-vitals` and records:

- the Web Vitals LCP, INP, CLS, FCP and TTFB;
- the duration of a quarter of API calls, read from the browser's timing data (live streams
  and telemetry itself are skipped);
- script errors and unhandled rejections, each distinct one reported once, ten per page at most.

Each event carries a kind, a name, a value, a short detail, the device class (phone up to
760 px wide, tablet up to 1099 px, desktop) and the page name. Never an account, a cookie, a
query string or anything a player typed.

**When nothing is sent.** If the browser sends Do Not Track or Global Privacy Control, the
client does not start at all.

**How it travels.** Events are batched and sent every 30 seconds, at 40 events, and when the
page is hidden, without cookies. The server accepts at most 40 events per batch and 12 batches
per minute per address, drops malformed events, and keeps API timings only as route patterns
(`/api/rooms/:code`), never real paths.

**Retention.** 20,000 rows per UTC day, 200,000 in total (oldest deleted first), 30 days at
most. Sources: `apps/web/src/features/telemetry/client.ts`,
`apps/server/src/features/telemetry/`, `packages/protocol/src/telemetry.ts`.

## Error log

Every unexpected server error (a `500`) and every process crash (an uncaught exception or an
unhandled rejection) is recorded in `error_log`: where it happened (`METHOD /pattern` or
`process`), the last request id, a message with secrets masked, and the top of the stack.
The same error — same place, same innermost frames — is one row with a count. The log keeps
1,000 errors for 90 days. A crash is recorded and alerted before the process exits.

## Alerts

Set `ALERT_WEBHOOK_URL` to be told about errors as they happen:

| URL                                | Sent as                 |
| ---------------------------------- | ----------------------- |
| `discord.com` or `discordapp.com`  | Discord JSON            |
| `hooks.slack.com`                  | Slack JSON              |
| anything else (an ntfy topic, say) | Plain text with a title |

At most one alert per distinct error every 15 minutes and 24 per day; the last one of the day
says so. Treat the URL as a secret: anyone who knows it can post to your channel.

## Reports

Run from the repository root; they open the database read-only (`data/game.sqlite`, or
`DB_PATH`).

| Command                                                    | Shows                                                                                                                        |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `node scripts/ops/telemetry-report.mjs [days]`             | Web Vitals at p50, p75 and p95 per device against targets, the slowest API routes, the top script errors (7 days by default) |
| `node scripts/ops/list-errors.mjs [hours] [--stack]`       | Server errors of the last 24 hours, with stacks on request                                                                   |
| `node scripts/ops/list-reports.mjs [--days n] [--limit n]` | Member reports ([social](social.md#moderation))                                                                              |

The image holds only the server, not these scripts. With Docker, copy the data folder out and
point the scripts at the copy:

```bash
docker compose cp app:/app/data ./data-copy
DB_PATH=data-copy/game.sqlite node scripts/ops/list-errors.mjs
```

## Installable app

The web app is a PWA (`apps/web/vite.config.ts`, `apps/web/src/features/pwa/`):

- **Manifest**: the game's name, standalone display, icons from `apps/web/public/icons/`.
  `pnpm icons` redraws them from `favicon.svg`.
- **Caching**: the built app is cached for offline use; navigation falls back to the app shell,
  never for `/api/`. Practice works offline; online screens show that the server is out of
  reach.
- **Updates**: a new version waits until the player chooses _Reload_ in the banner, so nobody
  loses a match to an update.
