/**
 * @cardgame/game — the rules of the game this app plays. The server, the bots and the web
 * client only import from here. To make your own game, rewrite this package (see
 * docs/making-a-game.md) and keep exporting `game`, `bots` and the four types.
 */
export { game } from './definition';
export { bots, basicBot, DEFAULT_BOT } from './bots';
export { canPlay, handPenalty, isWild, penalty } from './cards';
export { MAX_PLAYERS, MIN_PLAYERS } from './constants';
export type { Command, Options, State, View } from './types';
