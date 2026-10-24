/**
 * @cardgame/game — the rules of the game this app plays. The server, the bots and the web
 * client only import from here. To make your own game, rewrite this package (see
 * docs/making-a-game.md) and keep exporting `game`, `bots` and the four types.
 */
export { game } from './definition';
export { bots, basicBot, DEFAULT_BOT } from './bots';
export { isSpecial, isStandard } from './card-kinds';
export { canPlay, handPenalty, isWild, penalty } from './cards';
export { MAX_PLAYERS, MIN_PLAYERS } from './constants';
export { expansions } from './expansions';
export { hooksOf } from './extension';
export type { GameExpansion, Hooks, PlayEffect, Table } from './hooks';
export type { Card, Command, ExpansionData, Options, SpecialCard, State, View } from './types';
