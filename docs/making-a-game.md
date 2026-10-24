# Making a game

The template is wired so that a new game touches **two folders**: `packages/game` (rules) and
`apps/web/src/game` (its board). The engine, server, protocol and table shell stay as they are.

## 0. Rename the project

```bash
pnpm rename "Moon Poker" moon-poker   # display name, package scope, Docker image
pnpm install
```

Update `<title>`, the description and the colours in `apps/web/index.html`, and the home
headline in `apps/web/src/screens/HomeScreen.tsx`.

## 1. Write the rules down first

Copy [`packages/game/RULES.md`](../packages/game/RULES.md) and rewrite it for your game: the
components, the setup, a turn, every special card, how it ends, and the edge cases (empty deck,
ties, a player leaving). Each sentence of that document should map to a test.

## 2. Model the state, commands and view

In `packages/game/src/types.ts`:

- **State**: everything, secrets included, as plain JSON. Prefer arrays of ids and small
  records; keep the top of a pile at the end of its array (the zone helpers assume it).
- **Command**: a discriminated union of what a player can _decide_: `play`, `draw`, `bid`,
  `pass`… Everything a choice needs travels in the command (the eight's suit, a target seat).
- **View**: what one seat may know. Hand sizes, not hands; deck size, not deck.

Multi-step decisions (choose a target, then a card) are usually best as a **pending field** in
the state: `apply` stores `pending: { type: 'chooseTarget', seat }`, `actors` returns that seat,
and `legalCommands` offers only the answers. Simultaneous phases (everyone passes three cards)
return several seats from `actors` and record each answer until all are in.

## 3. Implement the definition

| File            | Writes                                                          |
| --------------- | --------------------------------------------------------------- |
| `constants.ts`  | Every number of the rules, named: hand size, targets, penalties |
| `cards.ts`      | The deck and pure helpers (`canPlay`, scores)                   |
| `setup.ts`      | Shuffle and deal with `ctx.rng`; log the opening                |
| `parse.ts`      | `parseCommand` and `parseOptions` with the engine's readers     |
| `rules.ts`      | `apply`, `legalCommands`, `actors`                              |
| `view.ts`       | The per-seat projection                                         |
| `outcome.ts`    | Winners, scores, reason                                         |
| `bots.ts`       | At least one `greedyBot`; list them in `bots`                   |
| `definition.ts` | Wires it all into `game: GameDefinition`                        |

Keep exporting `game`, `bots`, `DEFAULT_BOT`, `MIN_PLAYERS`, `MAX_PLAYERS` and the types
`State`, `Command`, `View`, `Options` from `src/index.ts`: the server and the web client
import those names.

## 4. Test it

- **Rules**: one `describe` per section of RULES.md, built from hand-written positions
  (`tests/helpers.ts` → `position({ hands, discard, … })`).
- **Conformance**: keep `tests/conformance.test.ts`; change `cardsConserved` and `handsSecret`
  to your game's invariants. It plays a hundred seeded games and pinpoints any broken contract.
- **Balance**: `pnpm sim --games 2000 --players 4` and `--bot basic --rivals random`. Check that
  the first seat has no large edge and that games end in a reasonable number of moves.

## 5. Draw the board

In `apps/web/src/game`, implement the `GameUi` contract (`apps/web/src/table/game-ui.ts`):

- `Board`: receives the `MatchController` (`view`, `send`, `names`, `busy`, `error`). Read
  `view.state` (your `View`) and `view.legal` to know what is clickable: never re-implement the
  rules in the UI.
- `describe(entry, names)`: one sentence per log event.
- `seatSummary(view, seat)`: the public line under each name ("5 cards", "12 points").
- `outcomeReason(outcome)`.

If your cards are not the standard deck, replace `components/PlayingCard.tsx` and the card
tokens in `styles/tokens.css`. Then update the two e2e specs in `apps/web/e2e`.

## 6. Ship

```bash
pnpm verify && pnpm test:e2e
docker compose up -d --build
```

## Checklist

- [ ] RULES.md rewritten; every rule has a test
- [ ] `State` is JSON; all randomness through `ctx.rng`
- [ ] Every illegal move throws `RuleError` with a readable message and a stable code
- [ ] `legalCommands` returns nothing for seats that may not act
- [ ] `view` hides other hands, the deck order and any secret choice
- [ ] Conformance passes with your invariants and a secrecy check
- [ ] A bot that beats random play; `pnpm sim` shows sane game lengths
- [ ] Board, log sentences and seat summary written; e2e specs updated
- [ ] `rulesVersion` bumped whenever rules change after launch
