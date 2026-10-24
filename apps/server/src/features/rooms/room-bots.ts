import { act, actorsOf, botCommand } from '@cardgame/engine';
import { bots, DEFAULT_BOT, game } from '@cardgame/game';
import { BOT_DELAY_MS, type Room } from './model';

/** The first seat that must act now and is played by a bot, if any. */
export function botToAct(room: Room): number | undefined {
  if (!room.match) return undefined;
  return actorsOf(game, room.match).find((seat) => room.seats[seat]?.bot);
}

/** Sets or clears the moment the next bot move is due. */
export function scheduleBot(room: Room, now: number) {
  room.botAt = botToAct(room) === undefined ? null : (room.botAt ?? now + BOT_DELAY_MS);
}

/** Plays one bot move; bots see only their own seat's view, like any player. */
export function playBot(room: Room): boolean {
  const seat = botToAct(room);
  if (seat === undefined || !room.match) return false;
  const bot = bots[room.seats[seat]!.bot!] ?? bots[DEFAULT_BOT]!;
  const command = botCommand(game, room.match, { seat, bot });
  room.match = act(game, room.match, { seat, command });
  room.botAt = null;
  return true;
}
