import type { Rank } from '@cardgame/engine';

export const GAME_ID = 'crazy-eights';
export const RULES_VERSION = 1;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/** Classic deal: seven cards each between two players, five each with more. */
export const HAND_SIZE_HEADS_UP = 7;
export const HAND_SIZE_GROUP = 5;
export const MIN_HAND_SIZE = 1;
export const MAX_HAND_SIZE = 8;

/** Eights are wild: they go on anything and their player names the next suit. */
export const WILD_RANK: Rank = '8';

/** Points a card left in hand gives to the winner. */
export const WILD_PENALTY = 50;
export const FACE_PENALTY = 10;
export const ACE_PENALTY = 1;
export const FACE_RANKS: readonly Rank[] = ['J', 'Q', 'K'];
