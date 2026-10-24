import type { GameUi } from '../table/game-ui';
import { Board } from './Board';
import { describe, outcomeReason } from './describe';

/** Crazy Eights' half of the table. Replace this folder when you replace packages/game. */
export const gameUi: GameUi = {
  Board,
  describe,
  outcomeReason,
  seatSummary: (view, seat) => {
    const count = view.state.handCounts[seat] ?? 0;
    return `${count} card${count === 1 ? '' : 's'}`;
  },
};
