import type { Match } from '@cardgame/engine';
import type { Command, Options, State } from '@cardgame/game';

/** A person stays “connected” this long after their last request or open live stream. */
export const PRESENCE_MS = 20_000;
/** The pause before a bot moves, so people can follow what happened. */
export const BOT_DELAY_MS = 900;
/** A room nobody has touched for this long is closed. */
export const ROOM_IDLE_MS = 2 * 60 * 60 * 1000;
export const MAX_ROOMS = 500;

export type GameMatch = Match<State, Command, Options>;

export type RoomSeat = {
  /** The person's player id; null for a bot. A seat never changes hands between people. */
  player: string | null;
  name: string;
  /** The bot playing this seat: chosen in the lobby, or taking over from someone who left. */
  bot: string | null;
  seen: number;
};

export type Room = {
  code: string;
  /** The player id of the host, who seats bots and deals. */
  host: string;
  seats: RoomSeat[];
  /** Raw lobby options, parsed by the game when the match is dealt. */
  options: Partial<Options>;
  match: GameMatch | null;
  /** Bumped on every change, lobby or match: clients send it back with each command. */
  revision: number;
  created: number;
  touched: number;
  /** When the next bot move is due, if a bot must act. */
  botAt: number | null;
};

export const seatOf = (room: Room, player: string) =>
  room.seats.findIndex((s) => s.player === player);
export const humans = (room: Room) => room.seats.filter((s) => s.player !== null);
export const isConnected = (seat: RoomSeat, now: number) =>
  seat.bot !== null || now - seat.seen <= PRESENCE_MS;
export const isLive = (room: Room) => room.match !== null && room.match.outcome === null;
