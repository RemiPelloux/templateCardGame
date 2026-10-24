import { randomBot, type Bot } from './bots';
import type { GameDefinition, Seat } from './definition';
import { clone } from './platform';
import { createRng } from './rng';
import { isReproducible } from './replay';
import { simulate } from './simulate';
import type { Match } from './match';

export type ConformanceOptions<S, C, V> = {
  /** Player counts to try; defaults to every count the game allows. */
  players?: number[];
  /** Seeded games per player count. */
  games?: number;
  bot?: Bot<V, C>;
  /** Your game's own invariant (cards conserved, scores in range…): throw to fail. */
  invariant?(state: S, players: number): void;
  /** Throws if a seat's view reveals something it must not (another hand, the deck order). */
  secrecy?(view: V, state: S, seat: Seat): void;
};

export type ConformanceReport = { games: number; moves: number; wins: number[] };

const DEFAULT_GAMES = 20;

/** Every legal command really applies, and nobody else may act. */
function checkLegality<S, C, V, O>(def: GameDefinition<S, C, V, O>, match: Match<S, C, O>) {
  // Once over, the engine refuses every move: there is nothing left to check.
  if (match.outcome) return;
  const actors = def.actors(match.state);
  for (let seat = 0; seat < match.players; seat++) {
    const legal = def.legalCommands(match.state, seat);
    if (!actors.includes(seat) && legal.length)
      throw new Error(`seat ${seat} has legal commands but is not an actor`);
    for (const command of legal) {
      const ctx = { seat, rng: createRng({ rng: match.rng }), log: () => {} };
      def.apply(clone(match.state), def.parseCommand(clone(command)), ctx);
    }
  }
  if (actors.length && actors.every((seat) => !def.legalCommands(match.state, seat).length))
    throw new Error('actors exist but none has a legal command');
}

function checkState<S, C, V, O>(
  def: GameDefinition<S, C, V, O>,
  match: Match<S, C, O>,
  options: ConformanceOptions<S, C, V>,
) {
  if (JSON.stringify(JSON.parse(JSON.stringify(match.state))) !== JSON.stringify(match.state))
    throw new Error('state is not plain JSON data');
  options.invariant?.(match.state, match.players);
  for (let seat = 0; seat < match.players; seat++)
    options.secrecy?.(def.view(match.state, seat), match.state, seat);
  def.view(match.state, null);
}

function playChecked<S, C, V, O>(
  def: GameDefinition<S, C, V, O>,
  run: { players: number; seed: number },
  options: ConformanceOptions<S, C, V>,
): Match<S, C, O> {
  const inspect = (position: Match<S, C, O>) => {
    try {
      checkLegality(def, position);
      checkState(def, position, options);
    } catch (error) {
      throw new Error(
        `${def.id}: ${(error as Error).message} (players ${run.players}, seed ${run.seed}, move ${position.version})`,
      );
    }
  };
  const match = simulate(def, { ...run, bots: options.bot ?? randomBot<V, C>(), inspect });
  if (!isReproducible(def, match))
    throw new Error(`${def.id}: replay differs (players ${run.players}, seed ${run.seed})`);
  return match;
}

/**
 * Plays many seeded games and checks the contract the engine relies on: games end, legal
 * commands agree with `apply`, only actors may act, state stays JSON, views keep secrets and
 * every game replays identically. Call it from a test; it throws with the failing seed.
 */
export function checkConformance<S, C, V, O>(
  def: GameDefinition<S, C, V, O>,
  options: ConformanceOptions<S, C, V> = {},
): ConformanceReport {
  const counts =
    options.players ??
    Array.from({ length: def.players.max - def.players.min + 1 }, (_, i) => def.players.min + i);
  const report: ConformanceReport = { games: 0, moves: 0, wins: Array(def.players.max).fill(0) };
  for (const players of counts)
    for (let seed = 1; seed <= (options.games ?? DEFAULT_GAMES); seed++) {
      const match = playChecked(def, { players, seed }, options);
      report.games++;
      report.moves += match.version;
      for (const seat of match.outcome!.winners) report.wins[seat]!++;
    }
  return report;
}
