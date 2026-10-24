# Notes for coding agents

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/architecture.md](docs/architecture.md) first.

- The game being played is defined only in `packages/game` (rules) and `apps/web/src/game`
  (board). A new game or a rules change should not need edits elsewhere; if it does, the
  change probably belongs in the engine or the shell and should stay game-agnostic.
- `packages/engine` must stay pure: no DOM, Node, timers, `Math.random` or `Date.now`.
- Never send raw state to a client or a bot: only `viewMatch(def, match, seat)`.
- After touching rules, run `pnpm test`: the conformance test is the safety net.
- `pnpm verify` is the definition of done. Browser tests (`pnpm test:e2e`) start their own
  server on port 4317; never leave a dev or preview server running.
