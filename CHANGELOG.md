# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com),
versions follow [SemVer](https://semver.org).

## [0.2.0] - 2026-10-24

### Added

- Translations: `@cardgame/i18n`, typed bundles per feature, English and French throughout.
- Accounts with passwords (scrypt), recovery codes, device sessions, export and deletion.
- Server feature modules with named migrations and domain events; coin wallet and inventory.
- Expansions: engine registry, game hooks, the _Jokers & Tricks_ expansion, `pnpm new:expansion`.
- Profile, XP and levels, missions, achievements and seasons, with end-of-match rewards.
- Shop, boosters, collection and cosmetics shown at the table.
- Friends, presence, table invites, blocks and reports with a moderation script.
- Daily challenge with streaks and rankings; ranked duels with Elo and matchmaking.
- Field telemetry, server error log and alerts; installable PWA with update prompt.

### Changed

- Guest names replaced by accounts; the protocol is split per domain.
- Documentation rewritten and checked against the code; new guides: getting started,
  accounts, HTTP API.
- The database defaults to `data/game.sqlite` at the repository root for every command.

### Removed

- The GitHub Actions workflow: checks run locally with `pnpm verify` and `pnpm test:e2e`.

### Fixed

- The Docker image installs every workspace package and ships the server's sources.
- `compose.yaml` passes `ALERT_WEBHOOK_URL` to the app.

## [0.1.0] - 2026-10-24

### Added

- `@cardgame/engine`: `GameDefinition` contract, matches, seeded RNG, per-seat views, bots,
  simulation, replay and the conformance harness.
- `@cardgame/game`: Crazy Eights as the worked example, with a basic bot and rules document.
- `@cardgame/protocol`: routes, request and view types shared by server and client.
- `@cardgame/server`: guest sessions, rooms with bots, Server-Sent Events, SQLite persistence
  and match archive, HTTP hardening, graceful shutdown.
- `@cardgame/web`: home, lobby, table and offline practice, with light and dark themes.
- Tooling: boundary check, bot simulator, rename script, CI, Docker and Caddy deployment.
