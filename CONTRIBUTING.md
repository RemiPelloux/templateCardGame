# Contributing

## Workflow

1. Branch from `main`: `feat/…`, `fix/…`, `docs/…`. Never push to `main` directly.
2. One logical change per commit, written as a
   [Conventional Commit](https://www.conventionalcommits.org): `feat(game): add jokers`,
   `fix(server): refuse a stale revision`, `docs: explain bots`.
3. `pnpm verify` before pushing; `pnpm test:e2e` when the UI or the API changed.
4. Stage files by path (`git add path/to/file`), not `git add -A`.

## Code rules

- **Size**: files under 300 lines (400 at most), functions under 25 lines, at most 3
  parameters (pass an object beyond that).
- **No magic numbers**: name every constant (`HAND_SIZE_GROUP`, `BOT_DELAY_MS`).
- **No leftovers**: no `console.log` for debugging, no commented-out code, no orphaned files.
- **Layers**: respect [the boundaries](docs/architecture.md#layers); `pnpm lint:boundaries`
  checks them.
- **Rules live in the game**: the UI reads `view.legal`, it never re-decides what is legal.
- **Errors**: refuse player input with `RuleError` (engine and game) or `ApiError` (server),
  each with a stable `code`. Any other exception is a bug.
- **Comments** say _why_, briefly; names say _what_. Exported functions get a one-line doc.
- Formatting is Prettier's (`pnpm format`); TypeScript is strict with
  `noUncheckedIndexedAccess`.

## Changing the rules after launch

Bump `rulesVersion` in `packages/game/src/constants.ts` when a change would alter saved or
archived matches, and say so in the changelog.
