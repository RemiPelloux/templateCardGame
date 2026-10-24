import { act, createMatch } from '@cardgame/engine';
import { bots, DEFAULT_BOT, game } from '@cardgame/game';
import type { CommandRequest, Player, SeatsRequest, StartRequest } from '@cardgame/protocol';
import { ApiError, forbidden } from '../http/errors';
import { humans, isLive, seatOf, type Room } from './model';

/**
 * The room's rules, as plain functions that change a room in place. RoomService calls them,
 * then bumps the revision, schedules bots and saves; no I/O happens here.
 */
const requireHost = (room: Room, player: Player) => {
  if (room.host !== player.id) throw forbidden('Only the host can do that.');
};
const requireLobby = (room: Room) => {
  if (isLive(room)) throw new ApiError('The match has already started.', 'MATCH_STARTED');
};

export function join(room: Room, player: Player, now: number) {
  const seat = seatOf(room, player.id);
  if (seat >= 0) return void (room.seats[seat]!.seen = now);
  requireLobby(room);
  if (room.seats.length >= game.players.max) throw new ApiError('This table is full.', 'ROOM_FULL');
  room.seats.push({ player: player.id, name: player.name, bot: null, seen: now });
}

export function changeSeats(room: Room, player: Player, request: SeatsRequest) {
  requireHost(room, player);
  requireLobby(room);
  if (request.action === 'addBot') {
    const bot = request.bot ?? DEFAULT_BOT;
    if (!bots[bot]) throw new ApiError('Unknown bot.', 'UNKNOWN_BOT');
    if (room.seats.length >= game.players.max)
      throw new ApiError('This table is full.', 'ROOM_FULL');
    const number = room.seats.filter((s) => s.bot).length + 1;
    room.seats.push({ player: null, name: `Bot ${number}`, bot, seen: 0 });
    return;
  }
  const seat = room.seats[request.seat];
  if (!seat || seat.player !== null) throw new ApiError('Only bots can be removed.', 'NOT_A_BOT');
  room.seats.splice(request.seat, 1);
}

/** Deals a new match, or a rematch once the previous one is over. */
export function start(room: Room, player: Player, request: StartRequest) {
  requireHost(room, player);
  requireLobby(room);
  if (request.options) room.options = { ...room.options, ...request.options };
  room.match = createMatch(game, { players: room.seats.length, options: room.options });
}

export function play(room: Room, player: Player, request: CommandRequest) {
  const seat = seatOf(room, player.id);
  if (seat < 0) throw forbidden('You are not seated at this table.');
  if (!room.match) throw new ApiError('The match has not started.', 'NOT_STARTED');
  if (request.revision !== room.revision)
    throw new ApiError('The table changed, try again.', 'STALE_REVISION', 409);
  room.match = act(game, room.match, { seat, command: request.command });
}

/**
 * Leaving the lobby frees the seat; leaving a live match hands it to a bot. A leaving host
 * passes the room to the next person. Returns false when nobody is left and the room should close.
 */
export function leave(room: Room, player: Player): boolean {
  const index = seatOf(room, player.id);
  if (index < 0) return humans(room).length > 0;
  if (isLive(room)) Object.assign(room.seats[index]!, { player: null, bot: DEFAULT_BOT });
  else room.seats.splice(index, 1);
  const next = humans(room)[0];
  if (room.host === player.id && next) room.host = next.player!;
  return next !== undefined;
}
