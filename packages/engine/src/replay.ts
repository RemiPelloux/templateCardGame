import type { GameDefinition } from './definition';
import { act, createMatch, type Match } from './match';

/**
 * Rebuilds a match from its seed, options and history. Deterministic rules make the result
 * identical to the original: use it to debug a reported game, audit a result or migrate saves.
 */
export function replay<S, C, V, O>(
  def: GameDefinition<S, C, V, O>,
  source: Pick<Match<S, C, O>, 'players' | 'seed' | 'options' | 'history'>,
): Match<S, C, O> {
  let match = createMatch(def, {
    players: source.players,
    seed: source.seed,
    options: source.options,
  });
  for (const move of source.history) match = act(def, match, move);
  return match;
}

/** True when replaying `match` from scratch lands on exactly the same state and outcome. */
export function isReproducible<S, C, V, O>(def: GameDefinition<S, C, V, O>, match: Match<S, C, O>) {
  const again = replay(def, match);
  return (
    JSON.stringify([again.state, again.outcome, again.rng]) ===
    JSON.stringify([match.state, match.outcome, match.rng])
  );
}
