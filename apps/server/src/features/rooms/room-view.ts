import { viewMatch } from '@cardgame/engine';
import { bots, game } from '@cardgame/game';
import type { Player, RoomStatus, RoomView } from '@cardgame/protocol';
import { isConnected, seatOf, type Room } from './model';

const statusOf = (room: Room): RoomStatus =>
  !room.match ? 'lobby' : room.match.outcome ? 'finished' : 'playing';

/**
 * Who is around: the clock, the players whose live stream is open, and what each person wears
 * (read from the economy's inventory; absent in tests that build rooms alone).
 */
export type Presence = {
  now: number;
  online: ReadonlySet<string>;
  looks?: (accountId: string) => Record<string, string>;
};

/** What one member may see of a room: the lobby, and the match through their own seat only. */
export function roomView(room: Room, viewer: Player, presence: Presence): RoomView {
  const you = seatOf(room, viewer.id);
  const seat = you >= 0 ? you : null;
  return {
    code: room.code,
    kind: room.kind,
    revision: room.revision,
    status: statusOf(room),
    seats: room.seats.map((s) => ({
      name: s.name,
      handle: s.handle,
      bot: s.bot,
      host: s.player !== null && s.player === room.host,
      connected: isConnected(s, presence.now) || presence.online.has(s.player ?? ''),
      looks: s.player && presence.looks ? presence.looks(s.player) : null,
    })),
    you: seat,
    isHost: room.host === viewer.id,
    limits: { minSeats: game.players.min, maxSeats: game.players.max },
    bots: Object.keys(bots),
    options: room.options,
    match: room.match ? viewMatch(game, room.match, seat) : null,
  };
}
