import type { GameDefinition, Seat } from './definition';
import type { Match } from './match';
import { createRng, deriveSeed, type Rng } from './rng';
import { viewMatch, type MatchView } from './view';

/** What a bot is shown: its own seat's view (with its legal commands) and a private RNG. */
export type BotTurn<View, Command> = { view: MatchView<View, Command>; seat: Seat; rng: Rng };

/**
 * A computer player. Bots receive the same view a human would, never the raw state, so they
 * cannot cheat by reading hidden cards. Given the same view and RNG they must choose the same
 * command: matches stay reproducible and tests stay stable.
 */
export interface Bot<View, Command> {
  id: string;
  choose(turn: BotTurn<View, Command>): Command;
}

export function randomBot<View, Command>(): Bot<View, Command> {
  return { id: 'random', choose: ({ view, rng }) => rng.pick(view.legal) };
}

/**
 * Plays the legal command with the highest score; ties go to the earliest legal command, or a
 * random one among the best when `shuffleTies` is set. Most heuristic bots are one `score`.
 */
export function greedyBot<View, Command>(
  id: string,
  score: (command: Command, view: MatchView<View, Command>) => number,
  shuffleTies = false,
): Bot<View, Command> {
  return {
    id,
    choose({ view, rng }) {
      const scored = view.legal.map((command) => ({ command, value: score(command, view) }));
      const best = Math.max(...scored.map((s) => s.value));
      const top = scored.filter((s) => s.value === best).map((s) => s.command);
      return shuffleTies ? rng.pick(top) : top[0]!;
    },
  };
}

/** A bot's command for `seat`, from that seat's view; its RNG is derived, never the match's. */
export function botCommand<S, C, V, O>(
  def: GameDefinition<S, C, V, O>,
  match: Match<S, C, O>,
  turn: { seat: Seat; bot: Bot<V, C> },
): C {
  const view = viewMatch(def, match, turn.seat);
  if (!view.legal.length)
    throw new Error(`${def.id}: seat ${turn.seat} must act but has no legal command.`);
  const rng = createRng({ rng: deriveSeed(match.seed, match.version, turn.seat) });
  return turn.bot.choose({ view, seat: turn.seat, rng });
}
