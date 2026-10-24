import type { ComponentType } from 'react';
import type { LogEntry, MatchView, Outcome } from '@cardgame/engine';
import type { Command, View } from '@cardgame/game';
import type { Translate } from '@cardgame/i18n';
import type { AppMessages } from '../i18n/messages';
import type { MatchController } from './controller';

type T = Translate<AppMessages>;

/**
 * The game-specific half of the table. The generic shell (seats, log, outcome, errors) is in
 * this folder; src/game implements this contract for the game being played. Text goes through
 * `t`, with the game's strings in src/game/i18n.ts.
 */
export type GameUi = {
  /** The play area: piles, the viewer's hand, the moves they can make. */
  Board: ComponentType<{ controller: MatchController }>;
  /** One log entry as a sentence. */
  describe(entry: LogEntry, names: string[], t: T): string;
  /** A short public line under a seat's name (“5 cards”). */
  seatSummary(view: MatchView<View, Command>, seat: number, t: T): string;
  /** Why the match ended, in words. */
  outcomeReason(outcome: Outcome, t: T): string;
};
