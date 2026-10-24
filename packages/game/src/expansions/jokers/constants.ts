import type { Rank } from '@cardgame/engine';

export const JOKERS_ID = 'jokers';
export const JOKERS_RULES_VERSION = 1;
/** The shop item that unlocks the expansion (`@cardgame/meta`). */
export const JOKERS_ITEM = 'expansion-jokers';

/** Two jokers join the 52 cards. */
export const JOKER = 'joker';
export const JOKER_COUNT = 2;
/** The player after a joker draws this many cards, then misses their turn. */
export const JOKER_DRAW = 2;
export const JOKER_PENALTY = 50;

/** A jack makes the next player miss their turn; a queen reverses the direction of play. */
export const SKIP_RANK: Rank = 'J';
export const REVERSE_RANK: Rank = 'Q';
/** With two players, reversing gives the turn back: a queen then works like a jack. */
export const HEADS_UP = 2;

/** Play starts clockwise (+1 seat); a queen flips the sign. */
export const CLOCKWISE = 1;

/** The basic bot plays its trick cards a little more eagerly than plain ones. */
export const TRICK_BONUS = 3;
