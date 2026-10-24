import type { Outcome, Seat } from '@cardgame/engine';
import { handPenalty } from './cards';
import type { State } from './types';

/** Each winner scores the points left in the other hands. */
function scoresFor(state: State, winners: Seat[]): number[] {
  const penalties = state.hands.map(handPenalty);
  const total = penalties.reduce((sum, points) => sum + points, 0);
  return penalties.map((points, seat) => (winners.includes(seat) ? total - points : 0));
}

/** Over when a hand is empty, or when nothing can be drawn and everyone has passed in a row. */
export function outcome(state: State): Outcome | null {
  const emptied = state.hands.findIndex((hand) => !hand.length);
  if (emptied >= 0)
    return { winners: [emptied], scores: scoresFor(state, [emptied]), reason: 'EMPTY_HAND' };
  if (state.blockedPasses < state.hands.length) return null;
  const penalties = state.hands.map(handPenalty);
  const lowest = Math.min(...penalties);
  const winners = penalties.flatMap((points, seat) => (points === lowest ? [seat] : []));
  return { winners, scores: scoresFor(state, winners), reason: 'BLOCKED' };
}
