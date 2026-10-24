# Making an expansion

An **expansion** (a DLC) is a box of extra cards and rules played on top of the base game:
[Jokers & Tricks](../packages/game/src/expansions/jokers/RULES.md) adds two jokers, jacks
that skip and queens that reverse. A match plays the base game plus **at most one**
expansion, chosen by the host among the ones they own.

```bash
pnpm new:expansion wild-west "Wild West"
```

writes everything below with an expansion that plays exactly like the base game, registers it
and adds its shop item. The rest of this guide explains what to fill in.

## How it fits together

| Layer                                | What it knows                                                  |
| ------------------------------------ | -------------------------------------------------------------- |
| `packages/engine/src/expansions.ts`  | Manifests and versions only: `createExpansionRegistry`         |
| `packages/game/src/hooks.ts`         | The game's **extension points** (`Hooks`), called by its rules |
| `packages/game/src/expansions/<id>/` | One expansion: manifest, hooks, constants, RULES.md            |
| `packages/meta/src/items.ts`         | The `expansion-<id>` item that unlocks it, with its price      |
| `apps/server/src/features/dlc/`      | `GET /api/expansions`; refuses one the host does not own       |
| `apps/web/src/game/expansions/<id>/` | Its card faces, log sentences, status line, text and rules     |
| `apps/web/src/features/dlc/`         | The lobby picker, the practice picker, the rules section       |

### The manifest

```ts
export const jokers: GameExpansion = {
  manifest: { id: 'jokers', rulesVersion: 1, oldestRulesVersion: 1, item: 'expansion-jokers' },
  hooks,
};
```

- `id` is permanent: it is stored in every match dealt with the expansion.
- `rulesVersion` is bumped when a rule change would alter saved matches. Each match records
  the version it was dealt with (`options.expansionRules`, `state.expansion.rulesVersion`), so
  a saved or replayed match keeps its rules: hooks read `state.expansion.rulesVersion` to
  branch where the rules changed.
- `oldestRulesVersion` is the oldest version the code still plays. Raising it retires old
  saves: `parseOptions` then refuses them (`EXPANSION_VERSION`).
- `item` is the inventory item a host must own.

### The hooks

The base rules call these at fixed points and keep their own behaviour where a hook is absent
(`packages/game/src/hooks.ts`):

| Hook       | Called                                      | Jokers & Tricks uses it to                  |
| ---------- | ------------------------------------------- | ------------------------------------------- |
| `cards`    | At the deal, before the shuffle             | Add two jokers (`{ id, special: 'joker' }`) |
| `setup`    | At the deal: the expansion's own state      | Start clockwise: `{ direction: 1 }`         |
| `isWild`   | Whenever the rules ask if a card is wild    | Make jokers wild                            |
| `canPlay`  | For a special card that is not wild         | (unused)                                    |
| `onPlay`   | After a card is played, hand not yet empty  | Joker: draw two and skip; jack; queen       |
| `nextSeat` | Whenever the turn passes                    | Follow the direction of play                |
| `penalty`  | When hands are scored                       | A joker left in hand is worth 50            |
| `view`     | In each seat's view (`view.expansionView`)  | Show the direction to everyone              |
| `botScore` | Added to the basic bot's score of a command | Play trick cards a little more eagerly      |

`onPlay` returns a `PlayEffect` (`{ draw?: number; skip?: boolean }`) that the base rules
apply to the next player, logging `forcedDraw` and `skip`; it may also change
`state.expansionState` and log its own events (`ctx.log('reverse', …)`). Hooks are pure like
the rules: randomness only through `ctx.rng`, state as plain JSON, nothing secret in `view`.

New cards are `SpecialCard`s (`{ id, special }`): they never have a suit or a rank, and the
game never starts on one. Expansions only see the base game through `card-kinds.ts`,
`hooks.ts` and `types.ts`, never `cards.ts` or `rules.ts`, which import the registry.

## Step by step

1. **Scaffold**: `pnpm new:expansion <id> "Name"`.
2. **Write the rules** in `packages/game/src/expansions/<id>/RULES.md`: components, setup,
   each new card or effect, scoring, edge cases. Every sentence should map to a test.
3. **Name the numbers** in `constants.ts` (cards added, penalties, bonuses).
4. **Implement the hooks** in `index.ts`. If the expansion needs a choice the base commands
   cannot carry, add it to the base `Command` and its `parseCommand` first: the board and bots
   read `view.legal`, so a new command shows up wherever it is legal.
5. **Test** in `packages/game/tests/expansions/<id>.test.ts`: one `describe` per RULES.md
   section on hand-written positions, and `checkConformance` with the expansion as the
   default options (see `jokers.test.ts`) with an invariant counting your cards. Check balance:
   `pnpm sim --games 2000 --players 4 --expansion <id>`.
6. **Draw it** in `apps/web/src/game/expansions/<id>/`: a `Face` for each special card kind,
   `describe` for each event the expansion logs, an optional `Status` line, and the bundle in
   English and French (name, tagline, card names, log sentences, `rules` sections shown on the
   rules screen). Translate any new error code under `errors` in the bundle.
7. **Price it**: adjust the `expansion-<id>` item in `packages/meta/src/items.ts`. The shop
   sells it like any item; owners see it in the lobby and in practice.
8. `pnpm verify`.

## Checklist

- [ ] RULES.md written; each rule has a test; conformance passes with the expansion
- [ ] Without the expansion, the base game plays exactly as before (its tests unchanged)
- [ ] Numbers named in `constants.ts`; hooks pure; `view` hides nothing secret
- [ ] The basic bot handles the new cards (`botScore` if it plays them badly)
- [ ] Card faces, log sentences and rules in English and French
- [ ] An `expansion-<id>` item with a price
- [ ] `rulesVersion` bumped on every incompatible change, `oldestRulesVersion` kept as low as
      the code allows
