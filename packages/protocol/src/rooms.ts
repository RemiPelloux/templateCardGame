import type { MatchView } from '@cardgame/engine';
import type { Command, Options, View } from '@cardgame/game';

/**
 * `casual`: friends and bots. `daily`: the day's shared deal against bots. `ranked`: a duel that
 * moves Elo. Features other than rooms only read it.
 */
export type RoomKind = 'casual' | 'daily' | 'ranked';

export type SeatsRequest =
  { action: 'addBot'; bot?: string } | { action: 'removeBot'; seat: number };
export type StartRequest = { options?: Partial<Options> };
/** Lobby options the host changes before the deal (the expansion…); merged into the room's. */
export type OptionsRequest = { options: Partial<Options> };
/** `revision` is the room revision the player saw: a stale one is refused, never misapplied. */
export type CommandRequest = { revision: number; command: Command };

export type SeatView = {
  name: string;
  /** `name#tag` for a person (profile links, friend requests); null for a bot. */
  handle: string | null;
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
  kind: RoomKind;
  revision: number;
  status: RoomStatus;
  seats: SeatView[];
  /** The viewer's seat, or null when watching. */
  you: number | null;
  isHost: boolean;
  limits: { minSeats: number; maxSeats: number };
  bots: string[];
  options: Partial<Options>;
  match: MatchView<View, Command> | null;
};

/** Server-Sent Events on `roomApi.events(code)`: only “the room changed”, never its content. */
export type RoomEvent = { revision: number };
/** Announced when a room closes: the next read answers NOT_FOUND. */
export const CLOSED_REVISION = -1;

export const roomApi = {
  rooms: '/api/rooms',
  /** Tables the member sits at, newest first (registered before `room(code)`). */
  mine: '/api/rooms/mine',
  room: (code: string) => `/api/rooms/${code}`,
  join: (code: string) => `/api/rooms/${code}/join`,
  leave: (code: string) => `/api/rooms/${code}/leave`,
  seats: (code: string) => `/api/rooms/${code}/seats`,
  options: (code: string) => `/api/rooms/${code}/options`,
  start: (code: string) => `/api/rooms/${code}/start`,
  commands: (code: string) => `/api/rooms/${code}/commands`,
  events: (code: string) => `/api/rooms/${code}/events`,
} as const;
