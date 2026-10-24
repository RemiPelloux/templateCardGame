# Making a game

Replace Crazy Eights with your game. The rules go in `packages/game`, everything the player
sees of them in `apps/web/src/game`; the platform around them stays as it is.

## 1. Rename the project

```bash
pnpm rename "Moon Poker" moon-poker   # display name, package scope, image name (needs a clean git tree)
pnpm install
```

Then update the app's name and colours in `apps/web/index.html`, and the name and tagline in
`apps/web/src/game/i18n.ts` (`name`, `tagline`) in every language.

## 2. Write the rules down

Copy [`packages/game/RULES.md`](../packages/game/RULES.md) and rewrite it for your game:
components, setup, a turn, every special card, how it ends, scoring, and the edge cases (empty
deck, ties, a player leaving). Each rule should end up as a test.

## 3. Model state, commands and view

In `packages/game/src/types.ts`:

- **State**: everything, secrets included, as plain JSON. Keep the top of a pile at the end of
  its array: the engine's zone helpers expect it.
- **Command**: a union of what a player can _decide_ (`play`, `draw`, `bid`, `pass`…). Every
  piece of a choice travels in the command: the suit named with an eight, a target seat.
- **View**: what one seat may know. Hand sizes, not hands; the deck's size, not its order.
- **Options**: what a lobby may choose. Keep `expansion` and `expansionRules` if you keep
  expansions: rooms and the shop read them.

A decision in several steps (choose a target, then a card) is best stored as a pending field
in the state: `apply` records it, `actors` returns the seat that must answer, `legalCommands`
offers only the answers. For simultaneous phases, return several seats from `actors` and
record each answer until all are in.

## 4. Implement the definition

| File (`packages/game/src/`) | Holds                                                                           |
| --------------------------- | ------------------------------------------------------------------------------- |
| `constants.ts`              | Every number of the rules, named (`RULES_VERSION` included)                     |
| `cards.ts`, `card-kinds.ts` | The deck and pure helpers (`canPlay`, penalties)                                |
| `setup.ts`                  | Shuffle and deal with `ctx.rng`; log the opening                                |
| `parse.ts`                  | `parseCommand` and `parseOptions`, with the engine's readers                    |
| `rules.ts`                  | `apply`, `legalCommands`, `actors`                                              |
| `view.ts`                   | The per-seat projection                                                         |
| `outcome.ts`                | Winners, scores, reason                                                         |
| `bots.ts`                   | At least one `greedyBot`, listed in `bots`                                      |
| `hooks.ts`, `extension.ts`  | Your extension points for expansions (see [expansions](making-an-expansion.md)) |
| `definition.ts`             | Everything wired into `game: GameDefinition`                                    |

`src/index.ts` must keep exporting the names the apps import: `game`, `bots`, `DEFAULT_BOT`,
`MIN_PLAYERS`, `MAX_PLAYERS`, `expansions`, `isStandard`, and the types `State`, `Command`,
`View`, `Options` and `Card`.

## 5. Test it

- **Rules**: one `describe` per section of your rules document, built from hand-written
  positions (`tests/helpers.ts`: `position({ hands, discard, … })`).
- **Conformance**: keep `tests/conformance.test.ts` and change its two checks to your game's:
  what is conserved (every card exactly once), and what is secret (no other hand in a view).
  It plays 20 seeded matches per player count and names the seed of any broken promise.
- **Balance**: `pnpm sim --games 2000 --players 4`, then `--bot basic --rivals random`. The first
  seat should have no large edge, matches should end in a sensible number of moves, and your
  bot should beat random play.

## 6. Draw the board

`apps/web/src/game/` implements the table's `GameUi` contract (`apps/web/src/table/game-ui.ts`):

- `Board`: receives the `MatchController` (`view`, `send`, `names`, `busy`, `error`…). Read
  `view.state` (your `View`) and `view.legal` to know what is clickable. Never re-implement a
  rule in the UI.
- `describe(entry, names, t)`: one sentence per log event, through translations.
- `seatSummary(view, seat, t)`: the public line under each name ("5 cards").
- `outcomeReason(outcome, t)`: why the match ended.

Replace `PlayingCard.tsx` if your cards are not the standard deck, and the card tokens in
`apps/web/src/styles/tokens.css`. Write every word in `apps/web/src/game/i18n.ts`, including
the `rules` sections shown on the rules page. Then update the browser tests in
`apps/web/e2e/`.

## 7. Decide what platform you keep

Every feature is a server folder, a web folder and one line in each registry. To drop one,
remove its folders and lines; the compiler lists anything that still refers to it. See
[adding a feature](features.md).

## Checklist

- [ ] Rules document written; every rule has a test
- [ ] `State` is JSON; all randomness comes from `ctx.rng`
- [ ] Every illegal move throws `RuleError` with a stable code, translated in `game/i18n.ts`
- [ ] `legalCommands` returns nothing for seats that may not act
- [ ] `view` hides other hands, the deck order and every secret choice
- [ ] Conformance passes with your conservation and secrecy checks
- [ ] A bot that beats random play; `pnpm sim` shows sensible game lengths
- [ ] Board, log sentences, seat summary and rules page written in every language
- [ ] Browser tests updated; `pnpm verify` and `pnpm test:e2e` pass
- [ ] `RULES_VERSION` bumped for every rule change after launch
