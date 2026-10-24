# Deployment

## Configuration

Read once at start-up by `apps/server/src/config.ts`:

| Variable            | Default            | Meaning                                                                                         |
| ------------------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| `PORT` / `HOST`     | `3000` / `0.0.0.0` | Where the server listens                                                                        |
| `DB_PATH`           | `data/game.sqlite` | SQLite file; `:memory:` keeps nothing                                                           |
| `STATIC_DIR`        | `apps/web/dist`    | The built web app                                                                               |
| `PUBLIC_ORIGIN`     |                    | Exact `https://` origin; **required** in production                                             |
| `TRUST_PROXY`       |                    | `1` only behind a private proxy that sets X-Forwarded-For                                       |
| `LOG_REQUESTS`      | on                 | `0` silences the per-request JSON lines                                                         |
| `ALERT_WEBHOOK_URL` |                    | ntfy, Discord or Slack webhook told about server errors; see [operations](operations.md#alerts) |

With `NODE_ENV=production` the server refuses to start without a valid `PUBLIC_ORIGIN`, and
session cookies are marked `Secure`.

## Docker

```bash
cp .env.example .env    # set DOMAIN
docker compose up -d --build
```

`compose.yaml` runs the app read-only, without capabilities, behind Caddy, which obtains and
renews the HTTPS certificate for `DOMAIN`. The SQLite file lives in the `game-data` volume.
The image runs `src/index.ts` through `tsx` as the unprivileged `node` user and has a health
check on `/api/health`.

## Without Docker

```bash
pnpm install --frozen-lockfile && pnpm build
NODE_ENV=production PUBLIC_ORIGIN=https://cards.example.com pnpm start
```

Put any TLS reverse proxy in front and set `TRUST_PROXY=1` if it sets `X-Forwarded-For`.

## Data

SQLite runs in WAL mode. For a consistent hot backup, use the SQLite online backup API:

```bash
sqlite3 data/game.sqlite ".backup 'backups/game-$(date +%F).sqlite'"
```

Restore by stopping the server and replacing the file (and removing `-wal`/`-shm` files).
Open rooms are restored at start-up; guests keep their sessions for 30 days.

## Scaling

One instance holds every room in memory, up to `MAX_ROOMS` (500 by default, in
`apps/server/src/rooms/model.ts`). Beyond one machine, see
[architecture § persistence](architecture.md#persistence).
