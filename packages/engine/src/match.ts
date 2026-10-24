import type { GameDefinition, LogEntry, LogOptions, Outcome, Seat } from './definition';
import { RuleError } from './errors';
import { clone } from './platform';
import { createRng, randomSeed, type RngHolder } from './rng';

/** Entries kept in a match's log; older ones drop off (the history keeps everything). */
export const MAX_LOG = 200;

export type HistoryEntry<Command> = { seat: Seat; command: Command };

/**
 * A match in progress: the game's state plus everything the engine adds around it. Plain JSON,
 * so it can be saved, cloned and replayed. Only the server (or a local practice game) holds one;
 * players only ever see a `MatchView`.
 */
export type Match<State, Command, Options = unknown> = RngHolder & {
  game: string;
  rulesVersion: number;
  players: number;
  options: Options;
  seed: number;
  /** Commands applied so far: the match's revision number. */
  version: number;
  state: State;
  log: LogEntry[];
  /** Every applied command in order: with the seed and options, it replays the match exactly. */
  history: HistoryEntry<Command>[];
  outcome: Outcome | null;
};

export type NewMatch = { players: number; seed?: number; options?: unknown };

function logger(holder: { log: LogEntry[] }, defaultSeat: Seat | null) {
  return (event: string, data?: Record<string, unknown>, options: LogOptions = {}) => {
    const entry: LogEntry = {
      seq: (holder.log[0]?.seq ?? 0) + 1,
      seat: options.seat === undefined ? defaultSeat : options.seat,
      event,
      ...(data ? { data } : {}),
      ...(options.visibleTo ? { visibleTo: options.visibleTo } : {}),
    };
    holder.log = [entry, ...holder.log].slice(0, MAX_LOG);
  };
}

function checkPlayers(def: GameDefinition<unknown, unknown, unknown, unknown>, players: number) {
  const { min, max } = def.players;
  if (!Number.isInteger(players) || players < min || players > max)
    throw new RuleError(`${def.name} is played by ${min} to ${max} players.`, 'PLAYER_COUNT');
}

/** Deals a new match. Without a seed the deal is unpredictable; with one it is reproducible. */
export function createMatch<S, C, V, O>(
  def: GameDefinition<S, C, V, O>,
  request: NewMatch,
): Match<S, C, O> {
  checkPlayers(def as GameDefinition<unknown, unknown, unknown, unknown>, request.players);
  const options =
    request.options === undefined ? def.defaultOptions : def.parseOptions(request.options);
  const seed = (request.seed ?? randomSeed()) >>> 0;
  const match = {
    game: def.id,
    rulesVersion: def.rulesVersion,
    players: request.players,
    options,
    seed,
    rng: seed,
    version: 0,
    log: [] as LogEntry[],
    history: [] as HistoryEntry<C>[],
    outcome: null,
  };
  const ctx = {
    players: request.players,
    options,
    rng: createRng(match),
    log: logger(match, null),
  };
  const state = def.setup(ctx);
  return { ...match, state, outcome: def.outcome(state) };
}

/**
 * The one way a match moves forward: checks the match is live and `seat` may act, reads the
 * untrusted command, applies it to a copy and returns the copy. A refused command throws a
 * RuleError and leaves the previous match untouched.
 */
export function act<S, C, V, O>(
  def: GameDefinition<S, C, V, O>,
  match: Match<S, C, O>,
  move: { seat: Seat; command: unknown },
): Match<S, C, O> {
  if (match.game !== def.id) throw new Error(`Match of ${match.game} given to ${def.id}.`);
  if (match.outcome) throw new RuleError('The match is over.', 'MATCH_OVER');
  if (!def.actors(match.state).includes(move.seat))
    throw new RuleError('It is not your turn.', 'NOT_YOUR_TURN');
  const command = def.parseCommand(move.command);
  // Only the state is deep-copied: log and history entries are append-only and never mutated,
  // so sharing them keeps each move O(state) instead of O(whole match).
  const next = { ...match, state: clone(match.state), log: match.log };
  def.apply(next.state, command, {
    seat: move.seat,
    rng: createRng(next),
    log: logger(next, move.seat),
  });
  next.history = [...match.history, { seat: move.seat, command }];
  next.version++;
  next.outcome = def.outcome(next.state);
  return next;
}

export const isOver = (match: Pick<Match<unknown, unknown>, 'outcome'>) => match.outcome !== null;

/** Seats that may act now; empty once the match is over. */
export const actorsOf = <S, C, V, O>(def: GameDefinition<S, C, V, O>, match: Match<S, C, O>) =>
  match.outcome ? [] : def.actors(match.state);
