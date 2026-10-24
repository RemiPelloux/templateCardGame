import type { Rng } from './rng';

/** A player's position at the table, from 0. Seats never move during a match. */
export type Seat = number;

export type Outcome = {
  /** Several winners for a tie or a team game; empty when nobody wins. */
  winners: Seat[];
  /** Final score per seat, when the game keeps one. */
  scores?: number[];
  /** A short machine-readable reason (`EMPTY_HAND`, `BLOCKED`…) the UI can translate. */
  reason?: string;
};

/**
 * One public or private event of the match, for the table's log and animations. Messages are
 * never stored as text: `event` and `data` let each client describe it in its own language.
 */
export type LogEntry = {
  seq: number;
  seat: Seat | null;
  event: string;
  data?: Record<string, unknown>;
  /** Seats allowed to see this entry; absent means everyone (spectators included). */
  visibleTo?: Seat[];
};

export type LogOptions = { seat?: Seat | null; visibleTo?: Seat[] };

export interface SetupContext<Options> {
  players: number;
  options: Options;
  rng: Rng;
  log(event: string, data?: Record<string, unknown>, options?: LogOptions): void;
}

export interface MoveContext {
  /** The seat that sent the command. */
  seat: Seat;
  rng: Rng;
  log(event: string, data?: Record<string, unknown>, options?: LogOptions): void;
}

/**
 * Everything the engine needs to know about one card game. Implement it once (packages/game)
 * and the server, the bots, the simulator, replays and the web client all work with it.
 *
 * Contract: every function is pure and synchronous. `State` must be plain JSON data (no class
 * instances, Maps, Dates or functions) because matches are cloned, saved and sent as JSON.
 */
export interface GameDefinition<State, Command, View, Options = Record<string, never>> {
  /** Stable id, stored with every match. */
  id: string;
  name: string;
  /** Bump when the rules change incompatibly: saved matches keep the version they began with. */
  rulesVersion: number;
  players: { min: number; max: number };
  defaultOptions: Options;
  /** Reads untrusted options (from a lobby) into valid ones, or throws RuleError. */
  parseOptions(input: unknown): Options;
  /** Deals the opening state. All randomness goes through `ctx.rng`. */
  setup(ctx: SetupContext<Options>): State;
  /** Seats that may act right now; several for simultaneous phases, none once the match is over. */
  actors(state: State): Seat[];
  /** Reads an untrusted command into a typed one, or throws RuleError. Shape only, not legality. */
  parseCommand(input: unknown): Command;
  /** Applies a command to a draft state (mutate freely), or throws RuleError if it is illegal. */
  apply(state: State, command: Command, ctx: MoveContext): void;
  /** Every command `seat` may send now. Bots and UI hints rely on it; it must agree with `apply`. */
  legalCommands(state: State, seat: Seat): Command[];
  /** The result once the match is over, otherwise null. */
  outcome(state: State): Outcome | null;
  /**
   * What one seat may know: hide other hands, the deck order, anything secret. `null` is a
   * spectator. Views are what clients and bots receive, never the raw state.
   */
  view(state: State, seat: Seat | null): View;
}

/** Any definition, for code that only routes matches around (server, registry). */
export type AnyGameDefinition = GameDefinition<any, any, any, any>;
