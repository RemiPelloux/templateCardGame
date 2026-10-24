# Deployment

The app is one Node process: it serves the API and the built web app on one port, and keeps
its data in one SQLite file.

## Configuration

Read once at start-up by `apps/server/src/core/config.ts`. A production server
(`NODE_ENV=production`) refuses to start when the configuration is unsafe.

| Variable            | Default                                   | Meaning                                                                                 |
| ------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `NODE_ENV`          |                                           | `production` turns on the checks below and `Secure` cookies                             |
| `PORT`, `HOST`      | `3000`, `0.0.0.0`                         | Where the server listens                                                                |
| `DB_PATH`           | `data/game.sqlite` at the repository root | The SQLite file; `:memory:` keeps nothing                                               |
| `STATIC_DIR`        | `apps/web/dist`                           | The built web app                                                                       |
| `PUBLIC_ORIGIN`     |                                           | The exact `https://` address of the app. **Required** in production; also turns on HSTS |
| `TRUST_PROXY`       |                                           | `1` only behind a private proxy that sets `X-Forwarded-For`                             |
| `DAILY_SALT`        | a development value                       | Secret behind the daily deals. **Required** in production, 16 characters or more        |
| `DAILY_TIME_ZONE`   | `Europe/Paris`                            | Whose midnight starts a new daily challenge                                             |
| `ALERT_WEBHOOK_URL` |                                           | Where server errors are announced ([operations](operations.md#alerts))                  |
| `LOG_REQUESTS`      | on                                        | `0` silences the one-line JSON log per request                                          |
| `PASSWORD_COST`     | production cost                           | `test` for fast, weak hashing. **Refused** in production                                |
| `RELAXED_LIMITS`    |                                           | `1` lifts rate limits for test servers. **Refused** in production                       |

The server reads no `.env` file itself: set variables in your shell, your service manager, or
through `compose.yaml`.

## With Docker

```bash
cp .env.example .env      # set DOMAIN and DAILY_SALT (openssl rand -hex 32)
docker compose up -d --build
```

`compose.yaml` runs two containers:

- **app**: the image built by the `Dockerfile` (Node 22, the server run by `tsx`, the built web
  app, the unprivileged `node` user, a health check on `/api/health`). It runs read-only with
  no capabilities, keeps its database in the `game-data` volume, and receives `PUBLIC_ORIGIN`
  (from `DOMAIN`), `TRUST_PROXY=1`, `DAILY_SALT`, `DAILY_TIME_ZONE` and `ALERT_WEBHOOK_URL`.
- **caddy**: the reverse proxy on ports 80 and 443. It obtains and renews the HTTPS
  certificate for `DOMAIN` and starts once the app is healthy.

`pnpm docker:build` builds the image alone.

## Without Docker

```bash
pnpm install --frozen-lockfile
pnpm build
NODE_ENV=production PUBLIC_ORIGIN=https://cards.example.com DAILY_SALT=… pnpm start
```

Put any HTTPS reverse proxy in front, and set `TRUST_PROXY=1` if it sets `X-Forwarded-For`.

## Behaviour worth knowing

- Fingerprinted assets are cached for a year; everything else, the service worker included,
  is revalidated on each visit.
- Each response carries an `X-Request-ID`. Requests time out after 15 s.
- On `SIGTERM` the server stops accepting requests, lets current ones finish (10 s at most),
  then closes the database. Open tables are restored at the next start.
- Security headers: a strict Content Security Policy, `X-Frame-Options: DENY`, `nosniff`, and
  HSTS once `PUBLIC_ORIGIN` is HTTPS.

## Data and backups

SQLite runs in WAL mode. For a consistent copy while the server runs:

```bash
sqlite3 data/game.sqlite ".backup 'backups/game-$(date +%F).sqlite'"
```

The image has no `sqlite3`; with Docker, stop the app for a moment and copy its data folder:

```bash
docker compose stop app
docker compose cp app:/app/data "backups/$(date +%F)"
docker compose start app
```

To restore, stop the server, replace `game.sqlite` and delete its `-wal` and `-shm`
companions. Open tables and sessions come back with the file.

## Scaling

One process holds every open table, up to 500. See [architecture](architecture.md#limits-of-the-design)
before running several.
