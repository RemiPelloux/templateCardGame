# Engine

`@cardgame/engine` knows nothing about any particular game. You describe a game once as a
`GameDefinition`; the engine does the rest. Every function is pure and synchronous.

## The contract

```ts
interface GameDefinition<State, Command, View, Options> {
  id: string; // stored with every match
  name: string;
  rulesVersion: number; // bump on incompatible rule changes
  players: { min: number; max: number };
  defaultOptions: Options;
  parseOptions(input: unknown): Options; // untrusted lobby options → typed, or RuleError
  setup(ctx: SetupContext<Options>): State; // the deal; randomness only via ctx.rng
  actors(state: State): Seat[]; // who may act now (several = simultaneous)
  parseCommand(input: unknown): Command; // untrusted JSON → typed, or RuleError
  apply(state: State, command: Command, ctx: MoveContext): void; // mutate, or throw RuleError
  legalCommands(state: State, seat: Seat): Command[]; // must agree with apply
  outcome(state: State): Outcome | null; // null while the match goes on
  view(state: State, seat: Seat | null): View; // what one seat may know; null = spectator
}
```

Rules of the contract, all checked by `checkConformance`:

- `State` is plain JSON: no classes, `Map`, `Date` or functions.
- `apply` may mutate its `state` argument freely: the engine hands it a private copy.
- Refuse illegal moves with `RuleError(message, code)`. The message is shown to the player;
  any other exception is treated as a bug and hidden behind a generic error.
- Every command in `legalCommands(state, seat)` must be accepted by `apply`, and seats that are
  not actors have none.
- Randomness only through `ctx.rng`. `Math.random` and `Date.now` break replays.
- `view` must not reveal anything secret: other hands, the deck order, hidden choices.

## Contexts

```ts
ctx.seat                              // MoveContext only: who sent the command
ctx.rng.int(n) / next() / pick(xs) / shuffle(xs)
ctx.log(event, data?, { seat?, visibleTo? })
```

Log entries are data (`{ seq, seat, event, data, visibleTo }`), not text: clients turn them into
sentences in their own language. `visibleTo: [seat]` keeps an entry private ("you drew the 7♣").

## Matches

```ts
const match = createMatch(game, { players: 4, seed?, options? });
const next = act(game, match, { seat: 2, command: untrustedInput });  // new Match, or RuleError
const view = viewMatch(game, next, 2);    // { state: View, legal, actors, log, outcome, … }
```

A `Match` is the state plus `seed`, `rng`, `version` (commands applied), `log` (newest first,
capped at 200 entries), `history` (every command) and `outcome`. `act` never mutates its input:
a refused command leaves the previous match intact.

## Bots

```ts
const bot = greedyBot<View, Command>('basic', (command, view) => score);
const command = botCommand(game, match, { seat, bot }); // bot sees viewMatch(…, seat) only
```

`randomBot()` plays any legal command. `greedyBot(id, score)` plays the best-scored one. For
lookahead (Monte Carlo, minimax), write a `Bot` whose `choose` samples possible hidden states
consistent with its view. It must never read the real state.

## Simulation, replay, conformance

```ts
simulate(game, { players, seed, bots, maxMoves?, inspect? });  // a whole bot match
replay(game, match);              // rebuild from seed + options + history
isReproducible(game, match);      // replay lands on the same state
checkConformance(game, { players?, games?, bot?, invariant?, secrecy? });
```

`checkConformance` plays `games` seeded matches per player count and checks, at every position:
legal commands apply, non-actors cannot act, state is JSON, your `invariant` holds, your
`secrecy` check passes for each seat's view, the match ends, and it replays identically. A
failure names the seed, player count and move, so you can replay it in a test.

## Kits

- `standardDeck(decks?)`: the 52-card deck (`{ id: 'QH', suit: 'hearts', rank: 'Q' }`),
  `SUITS`, `RANKS`, `rankOrder`, `isSuit`. Custom games define their own card type.
- Zones: `drawFrom(pile, n)` (top = end of the array), `takeById`, `moveById`, `findById`, `topOf`.
- Input readers for `parseCommand` / `parseOptions`: `readRecord`, `readOneOf`, `readString`,
  `readInteger`, `readBoolean`, `readOptional`. Each one throws a `RuleError` on bad input.
