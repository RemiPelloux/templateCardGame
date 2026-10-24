# Operations

What the running app measures about itself, what it keeps, and how to read it. Everything here
is in `apps/server/src/features/telemetry`, `apps/web/src/features/{telemetry,pwa}` and
`scripts/ops`.

## Field telemetry

The browser measures the real experience of players and sends it to `POST /api/telemetry`
(`apps/web/src/features/telemetry/client.ts`). Collection starts once the page is idle, so it
never competes with the first render.

| Kind    | Name                                  | Value                    |
| ------- | ------------------------------------- | ------------------------ |
| `vital` | `LCP`, `INP`, `CLS`, `FCP`, `TTFB`    | ms (CLS has no unit)     |
| `api`   | the route pattern, `/api/rooms/:code` | response time in ms      |
| `error` | `script` or `promise`                 | 1, with the message, cut |

Each event also carries the **screen** (the route name: `room`, never the room code) and a
**device class** (`phone`, `tablet`, `desktop`, from the window width).

- **Web Vitals** come from `web-vitals`, loaded lazily.
- **API timings** come from the browser's Resource Timing entries: no request is wrapped. A
  quarter of calls is sampled; live event streams and the telemetry call itself are skipped.
  The server stores the route **pattern** the path matched and drops paths that match no route,
  so room codes and usernames never reach the table.
- **Script errors** and unhandled promise rejections are reported once per distinct message and
  at most ten per page load, without query strings.

Batches leave every 30 seconds and when the page is hidden (`fetch` with `keepalive`), without
cookies.

### Privacy

- **Anonymous**: no account id, no session cookie, no IP address stored, no URL query, nothing
  a player typed, no cards. Rows hold a timestamp and the fields above.
- **Do Not Track**: a browser that sends Do Not Track or Global Privacy Control sends nothing at
  all. The data is already anonymous, but the player asked, so we do not argue.
- The shared schema (`packages/protocol/src/telemetry.ts`) is the only shape accepted: unknown
  kinds, names, devices or screens are dropped, values are bounded, details are cut to 160
  characters.

### Caps and retention

Named constants in `features/telemetry/store.ts`, `routes.ts` and the protocol:

| Limit                     | Value                       | When reached                       |
| ------------------------- | --------------------------- | ---------------------------------- |
| Events per batch          | 40 (`MAX_TELEMETRY_EVENTS`) | the batch is refused (400)         |
| Batches per minute per IP | 12                          | 429                                |
| Rows per UTC day          | 20 000 (`DAILY_ROW_CAP`)    | later events that day are dropped  |
| Rows in total             | 200 000                     | the oldest rows are deleted        |
| Retention                 | 30 days                     | an hourly sweep deletes older rows |

Dropped events still get `204`: a browser never retries telemetry.

### Reading the report

```bash
DB_PATH=data/game.sqlite node scripts/ops/telemetry-report.mjs 7
```

prints, for the last 7 days: p50, p75 and p95 of each Web Vital by device, with Google's "good"
threshold at p75; the 15 slowest API routes by p75; and the most frequent script errors. The
scripts open the database read-only, so they are safe on a live file. With Docker, run them on a
hot backup copied out of the volume (see [deployment § data](deployment.md#data)).

## Server error log

Any error that is not a refusal (`ApiError`, `RuleError`) becomes a generic `500` for the
client. The router still logs it as a JSON line, and tells listeners registered with
`router.onUnexpectedError` (`core/http/router.ts`). The telemetry feature is that listener:
it stores the error in `error_log` with

- the **route pattern** (`POST /api/rooms/:code/commands`), never the path or a body;
- the **request id** of the last occurrence, the `X-Request-ID` header, to find the request
  line in the logs;
- a **stack hash** of the error name and its innermost frames without line numbers, so the same
  bug is one row with a count across releases;
- the message with passwords, tokens and long opaque strings masked, and the top stack frames.

Process crashes (`uncaughtException`, `unhandledRejection`, in `src/index.ts`) go to the same
listeners with the route `process`, then the process exits with code 1 (within 5 seconds, so an
alert can leave) and the supervisor restarts it.

The table keeps 1 000 distinct errors (least recently seen deleted first) for 90 days.

```bash
DB_PATH=data/game.sqlite node scripts/ops/list-errors.mjs 24 --stack
```

lists the errors seen in the last 24 hours, most recent first, with their count, route, hash,
last request id and, with `--stack`, their frames.

## Alerts

Set `ALERT_WEBHOOK_URL` to be told about server errors as they happen. It receives a plain
`POST`:

- **ntfy** (`https://ntfy.sh/your-private-topic`) or any other URL: a `text/plain` body;
- **Discord** (`https://discord.com/api/webhooks/…`): JSON `{ "content": … }`;
- **Slack** (`https://hooks.slack.com/…`): JSON `{ "text": … }`.

Each alert says where (`request · GET /api/health`), how many times so far, and the masked
message. They are throttled: one per distinct error every 15 minutes, 24 per UTC day in all
(the last says so). A webhook that fails or takes more than 4 seconds is logged, without its
URL, and never delays a response. Treat the URL as a secret: it is the topic's password.

## Installable app (PWA)

`vite-plugin-pwa` (`apps/web/vite.config.ts`) adds a web app manifest and a Workbox service
worker to the build:

- **Manifest**: named after the game (`game.name` in `packages/game`), standalone, start URL
  `/`, category `games`, theme and background colours from the design tokens.
- **Caching**: every built asset is precached, and navigations fall back to the app shell, so
  the app opens offline and **practice works without a network** (it runs in the browser).
  `/api/` is never cached nor answered by the worker.
- **Offline**: online screens keep their usual translated error (`The server cannot be
reached.`), and a status bar says the app is offline (`features/pwa/PwaStatus.tsx`).
- **Updates**: `registerType: 'prompt'`. A new version installs in the background and waits; a
  status bar offers **Reload**, in the player's language, so a match is never interrupted. Old
  caches are cleaned on activation.
- **CSP**: `worker-src 'self'` and `manifest-src 'self'` (`core/http/policy.ts`).

The server sends `sw.js` and the manifest with `Cache-Control: no-cache`, so browsers check for
a new version on every visit.

### Icons

`apps/web/public/icons/` holds `icon-192.png`, `icon-512.png`, `maskable-512.png` (artwork in the
80 % safe zone on the background colour) and `apple-touch-icon.png` (linked from `index.html`).
They are drawn from `apps/web/public/favicon.svg`:

```bash
pnpm icons
```

Run it after changing the favicon and commit the PNGs.
