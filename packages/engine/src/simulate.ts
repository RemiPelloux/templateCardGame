import type { GameDefinition, Seat } from './definition';
import { act, actorsOf, createMatch, type Match } from './match';
import { botCommand, type Bot } from './bots';

/** A safety net: a game that has not ended after this many commands is considered stuck. */
export const DEFAULT_MAX_MOVES = 10_000;

export type Simulation<S, C, V, O> = {
  players: number;
  seed: number;
  options?: unknown;
  /** One bot for every seat, or one per seat. */
  bots: Bot<V, C> | ((seat: Seat) => Bot<V, C>);
  maxMoves?: number;
  /** Called with every position, the opening and the final one included (tests, statistics). */
  inspect?(match: Match<S, C, O>): void;
};

/**
 * Plays a whole match between bots. Use it to test that the rules always terminate, never
 * offer an illegal command and never crash, across thousands of seeds, and to balance the game.
 */
export function simulate<S, C, V, O>(
  def: GameDefinition<S, C, V, O>,
  run: Simulation<S, C, V, O>,
): Match<S, C, O> {
  const botFor = typeof run.bots === 'function' ? run.bots : () => run.bots as Bot<V, C>;
  const maxMoves = run.maxMoves ?? DEFAULT_MAX_MOVES;
  let match = createMatch(def, { players: run.players, seed: run.seed, options: run.options });
  run.inspect?.(match);
  while (!match.outcome) {
    if (match.version >= maxMoves)
      throw new Error(`${def.id}: no outcome after ${maxMoves} moves (seed ${run.seed}).`);
    const seat = actorsOf(def, match)[0];
    if (seat === undefined)
      throw new Error(`${def.id}: nobody can act but the match is not over (seed ${run.seed}).`);
    const command = botCommand(def, match, { seat, bot: botFor(seat) });
    match = act(def, match, { seat, command });
    run.inspect?.(match);
  }
  return match;
}
