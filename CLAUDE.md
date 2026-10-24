# Notes for coding agents

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/architecture.md](docs/architecture.md) first.

- A game is defined in `packages/game` (rules) and `apps/web/src/game` (its board and text).
  A rules change should not need edits elsewhere; if it does, the change probably belongs in
  the engine or the table shell, and must stay game-agnostic there.
- `packages/engine`, `packages/i18n`, `packages/meta`, `packages/game` and `packages/protocol`
  stay pure: no DOM, Node, timers, `Math.random` or `Date.now`.
- Never send the raw match state to a client or a bot: only `viewMatch(game, match, seat)`.
- A server feature reaches another only through `Services` or an event, never by import.
- Every word on screen goes through `t()`, in English and French.
- After touching rules, run `pnpm test`: the conformance test is the safety net.
- `pnpm verify` is the definition of done. Browser tests (`pnpm test:e2e`) start their own
  server on port 4317; never leave a development or preview server running.
