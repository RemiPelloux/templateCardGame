# Engine

`@cardgame/engine` knows no particular game. You describe a game once as a `GameDefinition`;
the engine deals matches, applies moves, builds each seat's view, runs bots, simulates,
replays and checks that your rules keep their promises. Everything is pure and synchronous.

## The contract

```ts
interface GameDefinition<State, Command, View, Options> {
  id: string; // stored with every match
  name: string;
  rulesVersion: number; // bump on incompatible rule changes
  players: { min: number; max: number };
  defaultOptions: Options;
  parseOptions(input: unknown): Options; // untrusted lobby options → typed, or RuleError
  setup(ctx: SetupContext<Options>): State; // the deal; randomness only through ctx.rng
  actors(state: State): Seat[]; // who may act now; several for simultaneous play
  parseCommand(input: unknown): Command; // untrusted JSON → typed, or RuleError
  apply(state: State, command: Command, ctx: MoveContext): void; // mutate, or throw RuleError
  legalCommands(state: State, seat: Seat): Command[]; // must agree with apply
  outcome(state: State): Outcome | null; // null while the match goes on
  view(state: State, seat: Seat | null): View; // what one seat may know; null is a spectator
}
```

The rules every definition must follow, all checked by `checkConformance`:

- `State` is plain JSON: no classes, `Map`, `Date` or functions.
- `apply` may mutate the state it receives; the engine hands it a private copy.
- An illegal move throws `RuleError(message, code, params?)`. The message is an English
  fallback; players see the translation of `code`. Any other exception is treated as a bug.
- Every command in `legalCommands(state, seat)` is accepted by `apply`, and seats that may not
  act have none.
- Randomness only comes from `ctx.rng`. `Math.random` and `Date.now` would break replays.
- `view` reveals nothing secret: no other hand, no deck order, no hidden choice.

## Contexts

```ts
ctx.seat                                  // MoveContext only: the seat that sent the command
ctx.rng.next() / int(n) / pick(list) / shuffle(list)
ctx.log(event, data?, { seat?, visibleTo? })
```

Log entries are data — `{ seq, seat, event, data?, visibleTo? }` — never sentences: each
client describes them in its reader's language. `visibleTo: [seat]` keeps an entry private,
like the card a player just drew.

## Matches and views

```ts
const match = createMatch(game, { players: 4, seed?, options? });
const next = act(game, match, { seat: 2, command: untrustedInput });
const view = viewMatch(game, next, 2);
```

- `createMatch` refuses a player count outside the game's range (`PLAYER_COUNT`). Without a
  seed the deal is unpredictable; with one it is reproducible.
- `act` returns a new match and never changes the one it was given. It refuses `MATCH_OVER`,
  `NOT_YOUR_TURN`, or whatever the game's `parseCommand` and `apply` refuse.
- A `Match` holds `game`, `rulesVersion`, `players`, `options`, `seed`, `rng`, `version` (moves
  applied), `state`, `log` (newest first, 200 entries at most), `history` (every move) and
  `outcome`.
- A `MatchView` holds `game`, `rulesVersion`, `version`, `players`, `you`, `actors`, `state`
  (the game's view), `legal` (empty unless it is your move), the last 50 visible log entries,
  and `outcome`.
- `actorsOf(game, match)` and `isOver(match)` answer the obvious questions.

## Bots

```ts
const basic = greedyBot<View, Command>('basic', (command, view) => score, shuffleTies?);
const command = botCommand(game, match, { seat, bot });
```

A bot receives its seat's view, never the state, plus its own RNG derived from the match seed,
the version and the seat: the same position always gets the same answer. `randomBot()` plays
any legal command; `greedyBot` plays the best-scored one, the first on a tie unless
`shuffleTies` is set. For lookahead, write a `Bot` whose `choose` samples hidden information
consistent with its view; it must never read the real state.

## Simulation, replay, conformance

```ts
simulate(game, { players, seed, bots, options?, maxMoves?, inspect? });
replay(game, match);           // rebuilds a match from seed, options and history
isReproducible(game, match);   // true when the replay lands on the same state
checkConformance(game, { players?, games?, bot?, invariant?, secrecy? });
```

- `simulate` plays a whole match between bots; it gives up after 10 000 moves.
- `checkConformance` plays `games` seeded matches (20 by default) for every allowed player
  count and checks, at every position: legal commands apply, only actors may act, the state is
  JSON, your `invariant(state, players)` holds, your `secrecy(view, state, seat)` holds for each
  seat, the match ends, and it replays identically. A failure names the game, the check, the
  player count, the seed and the move.

## Expansions

```ts
const registry = createExpansionRegistry<Hooks>([jokers, …]);
registry.read(id, version?);           // the expansion and the rules version to play
registry.playableVersion(id, version?);
```

An `Expansion<Hooks>` is a manifest — `id`, `rulesVersion`, `oldestRulesVersion`, and the shop
`item` that grants it — plus the hooks your game calls. The registry refuses unknown ids
(`UNKNOWN_EXPANSION`) and retired versions (`EXPANSION_VERSION`); ids are kebab-case. What the
hooks are is up to your game: [expansions](making-an-expansion.md) shows Crazy Eights'.

## Building blocks

| Group         | Exports                                                                                                                                        |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Randomness    | `createRng(holder)`, `randomSeed()`, `deriveSeed(...numbers)`                                                                                  |
| Zones         | `drawFrom(pile, n)` (the top is the end of the array), `takeById`, `moveById`, `findById`, `topOf`                                             |
| Standard deck | `standardDeck(decks = 1)` with ids like `QH` or `QH#2`, `SUITS`, `RANKS`, `rankOrder`, `isSuit`                                                |
| Input readers | `readRecord`, `readOneOf`, `readString` (200 characters by default), `readInteger`, `readBoolean`, `readOptional`: each throws `INVALID_INPUT` |
| Errors        | `RuleError`, `isRuleError`                                                                                                                     |
| Utilities     | `clone`, `visibleTo(entry, seat)`, `MAX_LOG` (200), `VIEW_LOG` (50), `DEFAULT_MAX_MOVES` (10 000)                                              |
