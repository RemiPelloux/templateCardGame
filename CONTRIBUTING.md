# Contributing

## Workflow

1. Branch from `main`: `feat/…`, `fix/…`, `docs/…`. Never push to `main` directly.
2. One logical change per commit, as a [Conventional Commit](https://www.conventionalcommits.org):
   `feat(game): add jokers`, `fix(server): refuse a stale revision`, `docs: explain bots`.
3. Stage files by path (`git add path/to/file`), never `git add -A`.
4. Before pushing: `pnpm verify`; when the UI or the API changed, also `pnpm test:e2e`.
5. Merge into `main` with `--no-ff`; never force-push.

## Code

- **Size**: files under 300 lines (400 at most), functions under 25 lines, at most three
  parameters (pass an object beyond that).
- **Names, not numbers**: every constant is named (`HAND_SIZE_GROUP`, `BOT_DELAY_MS`).
- **No leftovers**: no debugging output, no commented-out code, no orphaned files.
- **Layers**: respect [the boundaries](docs/architecture.md#packages-and-layers);
  `pnpm lint:boundaries` checks them.
- **Rules live in the game**: the UI reads `view.legal`; it never decides what is legal.
- **Errors**: refuse player input with `RuleError` (engine, game) or `ApiError` (server), each
  with a stable code translated on the web. Any other exception is a bug.
- **Text**: every word on screen goes through `t()`, in every language ([translations](docs/i18n.md)).
- **Comments** explain why, briefly; names say what. Exported functions get a one-line comment.
- **Formatting** is Prettier's (`pnpm format`); TypeScript is strict, with
  `noUncheckedIndexedAccess`.

## Docs

Docs are part of the change. Each guide follows the same order: what it is for, how it works,
its data, what to tune, how to extend it. Endpoints are listed once, in
[docs/api.md](docs/api.md). Write short sentences in the present tense, name files by their
path from the repository root, and give exact values with the constant that holds them.

## Changing rules after launch

Raise `RULES_VERSION` in `packages/game/src/constants.ts` (or an expansion's `rulesVersion`)
when a change would alter saved or archived matches, and record it in the changelog.
