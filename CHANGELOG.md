# Changelog

All notable changes to this project. Format: [Keep a Changelog](https://keepachangelog.com),
versions follow [SemVer](https://semver.org).

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
