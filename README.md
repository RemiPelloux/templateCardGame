# Card Game Template

A complete starting point for **online, turn-based card games** in TypeScript. You write the
rules once, as a pure `GameDefinition`. The template supplies everything around them: a
server that runs matches, bots, accounts, a metagame, a React client in English and French,
tests and deployment.

It ships with **Crazy Eights** and one expansion, **Jokers & Tricks**, both playable and
tested. Replace them with your game.

## What you get

| Area         | Included                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------- |
| Rules engine | Matches, seeded shuffles, per-seat views, bots, simulation, exact replays, a rules fuzzer |
| Expansions   | Versioned DLC with ownership checks and rule hooks; `pnpm new:expansion` scaffolds one    |
| Multiplayer  | Server-authoritative tables, live updates, bot seats, reconnection after restarts         |
| Accounts     | Passwords, recovery codes, device sessions, data export and deletion                      |
| Metagame     | Levels, missions, achievements, seasons, coins, a shop with boosters, cosmetics           |
| Social       | Friends, presence, table invites, blocks, reports                                         |
| Competitive  | A daily challenge with streaks and rankings, ranked duels with Elo                        |
| Client       | React 19, installable PWA, offline practice, English and French                           |
| Operations   | Anonymous telemetry, error log with alerts, Docker and Caddy                              |

## Quick start

You need Node 22.12 or later and pnpm 10 (`corepack enable`).

```bash
pnpm install
pnpm dev       # http://localhost:5173 — the app and the real API in one process
pnpm test      # unit, rules and HTTP tests
pnpm verify    # formatting, boundaries, types, tests, build
```

New here? Follow **[Getting started](docs/getting-started.md)**: it takes you from this
checkout to your own game.

## How it is organised

```text
packages/
  engine/     the game-agnostic kernel: matches, views, bots, expansions (pure, no I/O)
  game/       your rules: Crazy Eights and its expansions
  meta/       the metagame as data: items, levels, missions, boosters, Elo
  i18n/       typed translations
  protocol/   the types and endpoints shared by server and client
apps/
  server/     Node server, one folder per feature in src/features/
  web/        React client, one folder per feature in src/features/
docs/         the guides below
scripts/      boundary check, simulator, scaffolding, icons, ops reports
```

The server is the only authority: clients send commands, never state, and each player only
ever receives their own view of a match. See [architecture](docs/architecture.md).

## Documentation

Start with [getting started](docs/getting-started.md); every guide is listed in
[docs/README.md](docs/README.md).

| Build your game                           | Understand the platform              | Run it                           |
| ----------------------------------------- | ------------------------------------ | -------------------------------- |
| [Making a game](docs/making-a-game.md)    | [Architecture](docs/architecture.md) | [Deployment](docs/deployment.md) |
| [Engine](docs/engine.md)                  | [Multiplayer](docs/multiplayer.md)   | [Operations](docs/operations.md) |
| [Expansions](docs/making-an-expansion.md) | [Accounts](docs/accounts.md)         | [Testing](docs/testing.md)       |
| [Adding a feature](docs/features.md)      | [Economy](docs/economy.md)           | [HTTP API](docs/api.md)          |
| [Translations](docs/i18n.md)              | [Progression](docs/progression.md)   | [Design](docs/design.md)         |
|                                           | [Social](docs/social.md)             |                                  |
|                                           | [Competitive](docs/competitive.md)   |                                  |

## Commands

| Command                | Does                                                                  |
| ---------------------- | --------------------------------------------------------------------- |
| `pnpm dev`             | Development server with the real API (port 5173)                      |
| `pnpm build`           | Production build of the web app into `apps/web/dist`                  |
| `pnpm start`           | Production server: API and built app on `PORT` (3000)                 |
| `pnpm test`            | Unit, rules and HTTP tests (`pnpm test:watch` to keep them running)   |
| `pnpm test:e2e`        | Browser tests: builds, then serves on port 4317 with a fresh database |
| `pnpm check`           | TypeScript in every package                                           |
| `pnpm lint:boundaries` | Fails when a package imports something its layer may not              |
| `pnpm format`          | Prettier (`pnpm format:check` only checks)                            |
| `pnpm verify`          | Format, boundaries, types, tests and build: run it before pushing     |
| `pnpm sim`             | Bot-versus-bot statistics, e.g. `pnpm sim --games 1000 --players 4`   |
| `pnpm new:expansion`   | Scaffold an expansion: `pnpm new:expansion pirates "Pirates"`         |
| `pnpm rename`          | Rename the project: `pnpm rename "Moon Poker" moon-poker`             |
| `pnpm icons`           | Redraw the app icons from `apps/web/public/favicon.svg`               |
| `pnpm docker:build`    | Build the production image                                            |

## Origin

The architecture comes from Deal Club, a multiplayer card game in production: pure
transitions, server authority, per-seat views, revision-checked commands, and live updates
with polling as a safety net.

Private and unlicensed: all rights reserved.
