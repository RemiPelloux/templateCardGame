import type { MatchView } from '@cardgame/engine';
import type { Command, View } from '@cardgame/game';

/**
 * What the table needs from a match, wherever it is played. Offline practice runs the engine in
 * the browser; an online room asks the server. The table and the board never know which.
 */
export type MatchController = {
  view: MatchView<View, Command>;
  /** Seat names, in seat order. */
  names: string[];
  bots: boolean[];
  send(command: Command): void;
  /** A command is on its way. */
  busy: boolean;
  error: string | null;
  dismissError(): void;
  /** Deals again once the match is over; absent when the viewer may not (an online guest). */
  rematch?: () => void;
};
