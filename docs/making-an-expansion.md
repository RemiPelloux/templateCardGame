# Making an expansion

An expansion (a DLC) adds cards and rules on top of the base game and is unlocked by an item
from the shop. A match plays the base game plus at most one expansion, chosen by the host
among those they own. [Jokers & Tricks](../packages/game/src/expansions/jokers/RULES.md) is the
worked example: two jokers that make the next player draw two and miss their turn, jacks that
skip, queens that reverse.

```bash
pnpm new:expansion wild-west "Wild West"
```

creates an expansion that plays exactly like the base game, registers it everywhere and adds
its shop item. The rest of this guide explains what to fill in.

## How it fits together

| Where                                | What it holds                                                    |
| ------------------------------------ | ---------------------------------------------------------------- |
| `packages/engine/src/expansions.ts`  | Manifests and versions: `createExpansionRegistry`                |
| `packages/game/src/hooks.ts`         | The game's extension points (`Hooks`), called by its rules       |
| `packages/game/src/expansions/<id>/` | One expansion: manifest, hooks, constants, rules document        |
| `packages/meta/src/items.ts`         | The `expansion-<id>` item that unlocks it, and its price         |
| `apps/server/src/features/dlc/`      | The catalog endpoint; refuses an expansion the host does not own |
| `apps/web/src/game/expansions/<id>/` | Its card faces, log sentences, status line and text              |
| `apps/web/src/features/dlc/`         | The lobby picker, the practice picker, the rules section         |

## The manifest

```ts
export const jokers: GameExpansion = {
  manifest: { id: 'jokers', rulesVersion: 1, oldestRulesVersion: 1, item: 'expansion-jokers' },
  hooks,
};
```

- `id` is permanent and kebab-case: every match dealt with the expansion stores it.
- `rulesVersion` goes up when a rule change would alter a saved match. Each match records the
  version it was dealt with (`options.expansionRules`, `state.expansion.rulesVersion`), so a
  saved or replayed match keeps its rules; hooks branch on it where rules changed.
- `oldestRulesVersion` is the oldest version the code still plays. Raising it retires older
  matches: they are refused with `EXPANSION_VERSION`.
- `item` is what a host must own to choose the expansion.

## The hooks

The base rules call each hook at a fixed point and keep their own behaviour when it is absent.
All are optional and pure: randomness through `ctx.rng`, state as plain JSON, nothing secret
in `view`.

| Hook       | Signature                                | Called                                   | Jokers & Tricks uses it to            |
| ---------- | ---------------------------------------- | ---------------------------------------- | ------------------------------------- |
| `cards`    | `() => SpecialCard[]`                    | At the deal, before the shuffle          | Add the two jokers                    |
| `setup`    | `(players) => ExpansionData`             | At the deal: the expansion's own state   | Start clockwise                       |
| `isWild`   | `(card) => boolean \| undefined`         | Whenever the rules ask if a card is wild | Make jokers wild                      |
| `canPlay`  | `(card: SpecialCard, state) => boolean`  | For a special card that is not wild      | (unused)                              |
| `onPlay`   | `({ state, card, ctx }) => PlayEffect`   | After a play, when the hand is not empty | Joker: draw two and skip; jack; queen |
| `nextSeat` | `(state, seat) => Seat`                  | Whenever the turn passes                 | Follow the direction of play          |
| `penalty`  | `(card) => number \| undefined`          | When hands are scored                    | A joker left in hand is worth 50      |
| `view`     | `(state, seat \| null) => ExpansionData` | In each view, as `view.expansionView`    | Show the direction to everyone        |
| `botScore` | `(command, view) => number`              | Added to the basic bot's score           | Play trick cards a little earlier     |

`onPlay` returns `{ draw?, skip? }`; the base rules apply it to the next player and log
`forcedDraw` and `skip`. It may also change `state.expansionState` and log its own events.

New cards are `SpecialCard`s, `{ id, special }`: they have no suit or rank, and a game never
starts on one. An expansion only sees the base game through `card-kinds.ts`, `hooks.ts` and
`types.ts`.

## Step by step

1. **Scaffold** with `pnpm new:expansion <id> "Name"`. It creates
   `packages/game/src/expansions/<id>/` (`index.ts`, `constants.ts`, `RULES.md`),
   `packages/game/tests/expansions/<id>.test.ts` and `apps/web/src/game/expansions/<id>/`
   (`index.ts`, `i18n.ts`), and adds one line each to the game's registry, the web's
   `EXPANSION_UIS`, the translation bundles and the item catalog.
2. **Write the rules** in `RULES.md`: components, setup, each new card or effect, scoring, edge
   cases.
3. **Name the numbers** in `constants.ts`: cards added, penalties, bonuses.
4. **Implement the hooks** in `index.ts`. If the expansion needs a choice the base commands
   cannot carry, add it to the base `Command` and `parseCommand` first: boards and bots read
   `view.legal`, so the new command shows up wherever it is legal.
5. **Test** one `describe` per rules section, and run `checkConformance` with the expansion
   chosen, counting your new cards in the invariant (see `jokers.test.ts`). Check balance with
   `pnpm sim --games 2000 --players 4 --expansion <id>`.
6. **Draw it** in `apps/web/src/game/expansions/<id>/`: a `Face` for each special card kind,
   `describe` for each event it logs, an optional `Status` line, and the text bundle in every
   language — name, tagline, card names, log sentences, the `rules` sections shown on the rules
   page, and any new error code under `errors`. Rename `index.ts` to `index.tsx` once it holds
   JSX. The bundle's namespace is the camel-case id (`wildWest`).
7. **Price it**: the scaffold adds `expansion-<id>` as rare, 500 coins. Adjust it in
   `packages/meta/src/items.ts`. The shop sells it like any item; owners then see it in the
   lobby and in practice.
8. Run `pnpm verify`.

## Checklist

- [ ] Rules document written; every rule has a test; conformance passes with the expansion
- [ ] Without the expansion the base game plays exactly as before
- [ ] Numbers named; hooks pure; `view` hides nothing secret
- [ ] The basic bot plays the new cards sensibly (`botScore` if not)
- [ ] Card faces, log sentences and rules in every language
- [ ] The `expansion-<id>` item has a price
- [ ] `rulesVersion` bumped on every incompatible change
