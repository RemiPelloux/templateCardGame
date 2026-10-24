# Documentation

Every guide follows the same order: what the subject is for, how it works, the data it keeps,
what you can tune, and how to extend it. Endpoints are listed once, in the [HTTP API](api.md).

## Read first

1. [Getting started](getting-started.md): run the template, find your way, change something.
2. [Architecture](architecture.md): the packages, how a move travels, who may see what.
3. [Making a game](making-a-game.md): replace Crazy Eights with your game.

## Build your game

- [Engine](engine.md): the `GameDefinition` contract and the engine's API
- [Making a game](making-a-game.md): the step-by-step guide and its checklist
- [Expansions](making-an-expansion.md): add cards and rules sold as DLC
- [Adding a feature](features.md): a new server module and its screens
- [Translations](i18n.md): how text is translated, and adding a language

## The platform

- [Multiplayer](multiplayer.md): tables, revisions, live updates, bots
- [Accounts](accounts.md): passwords, sessions, recovery, export and deletion
- [Economy](economy.md): coins, items, the shop, boosters, cosmetics
- [Progression](progression.md): levels, missions, achievements, seasons, profiles
- [Social](social.md): friends, presence, invites, blocks, reports
- [Competitive](competitive.md): the daily challenge and ranked duels
- [HTTP API](api.md): every endpoint, its body, answer and errors

## Running it

- [Testing](testing.md): what each kind of test proves, and how to run it
- [Design](design.md): tokens, themes, components, accessibility
- [Deployment](deployment.md): configuration, Docker and Caddy, backups
- [Operations](operations.md): telemetry, the error log, alerts, the installable app

## Rules documents

- [Crazy Eights](../packages/game/RULES.md), which doubles as a template for yours
- [Jokers & Tricks](../packages/game/src/expansions/jokers/RULES.md)

Conventions for changes are in [CONTRIBUTING](../CONTRIBUTING.md).
