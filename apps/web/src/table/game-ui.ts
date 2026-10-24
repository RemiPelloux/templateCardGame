import type { ComponentType } from 'react';
import type { LogEntry, MatchView, Outcome } from '@cardgame/engine';
import type { Command, View } from '@cardgame/game';
import type { MatchController } from '../play/controller';

/**
 * The game-specific half of the table. The generic shell (seats, log, outcome, errors) is in
 * this folder; src/game implements this contract for the game being played.
 */
export type GameUi = {
  /** The play area: piles, the viewer's hand, the moves they can make. */
  Board: ComponentType<{ controller: MatchController }>;
  /** One log entry as a sentence. */
  describe(entry: LogEntry, names: string[]): string;
  /** A short public line under a seat's name (“5 cards”). */
  seatSummary(view: MatchView<View, Command>, seat: number): string;
  /** Why the match ended, in words. */
  outcomeReason(outcome: Outcome): string;
};
