import type { MatchView } from '@cardgame/engine';
import type { Command, Options, View } from '@cardgame/game';

export type Player = { id: string; name: string };

export type CreateSessionRequest = { name: string };
export type SessionResponse = { player: Player };

export type SeatsRequest =
  { action: 'addBot'; bot?: string } | { action: 'removeBot'; seat: number };
export type StartRequest = { options?: Partial<Options> };
/** `revision` is the room revision the player saw: a stale one is refused, never misapplied. */
export type CommandRequest = { revision: number; command: Command };

export type SeatView = {
  name: string;
  /** The bot's id for a computer seat, null for a person. */
  bot: string | null;
  host: boolean;
  /** A person seen recently; bots are always connected. */
  connected: boolean;
};

export type RoomStatus = 'lobby' | 'playing' | 'finished';

/** One member's view of a room: the lobby, and their own seat's view of the match. */
export type RoomView = {
  code: string;
  revision: number;
  status: RoomStatus;
  seats: SeatView[];
  /** The viewer's seat, or null when watching. */
  you: number | null;
  isHost: boolean;
  limits: { minSeats: number; maxSeats: number };
  bots: string[];
  match: MatchView<View, Command> | null;
};

export type ErrorBody = { error: { code: string; message: string } };

/** Server-Sent Events on `api.events(code)`: only “the room changed”, never its content. */
export type RoomEvent = { revision: number };
/** Announced when a room closes: the next read answers ROOM_NOT_FOUND. */
export const CLOSED_REVISION = -1;
