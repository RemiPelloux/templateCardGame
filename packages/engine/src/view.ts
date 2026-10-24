import type { GameDefinition, LogEntry, Outcome, Seat } from './definition';
import { actorsOf, type Match } from './match';

/** Log entries a view carries: enough for a table's recent history without resending it all. */
export const VIEW_LOG = 50;

/** One seat's window onto a match: the only thing that ever leaves the server for a player. */
export type MatchView<View, Command> = {
  game: string;
  rulesVersion: number;
  version: number;
  players: number;
  /** The viewer's seat, or null for a spectator. */
  you: Seat | null;
  actors: Seat[];
  /** The game's own view for this seat (other hands hidden, deck order hidden…). */
  state: View;
  /** The commands the viewer may send now; empty when it is not their move. */
  legal: Command[];
  log: LogEntry[];
  outcome: Outcome | null;
};

export const visibleTo = (entry: LogEntry, seat: Seat | null) =>
  !entry.visibleTo || (seat !== null && entry.visibleTo.includes(seat));

export function viewMatch<S, C, V, O>(
  def: GameDefinition<S, C, V, O>,
  match: Match<S, C, O>,
  seat: Seat | null,
): MatchView<V, C> {
  const actors = actorsOf(def, match);
  const acting = seat !== null && actors.includes(seat);
  return {
    game: match.game,
    rulesVersion: match.rulesVersion,
    version: match.version,
    players: match.players,
    you: seat,
    actors,
    state: def.view(match.state, seat),
    legal: acting ? def.legalCommands(match.state, seat) : [],
    log: match.log.filter((entry) => visibleTo(entry, seat)).slice(0, VIEW_LOG),
    outcome: match.outcome,
  };
}
