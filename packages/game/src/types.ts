import type { PlayingCard, Seat, Suit } from '@cardgame/engine';

export type Options = {
  /** Cards dealt to each player; null deals the classic amount (7 for two players, 5 otherwise). */
  handSize: number | null;
};

/** The full, secret state. Only the engine and the rules ever read it. */
export type State = {
  hands: PlayingCard[][];
  /** Face down; the top card is the last one. */
  deck: PlayingCard[];
  /** Face up; the top card is the last one. */
  discard: PlayingCard[];
  /** The suit to follow: the top card's, or the one named with an eight. */
  suit: Suit;
  turn: Seat;
  /** The player to move has already drawn this turn. */
  drawn: boolean;
  /** Passes in a row with nothing left to draw: once everyone has passed, the game is blocked. */
  blockedPasses: number;
};

export type Command =
  { type: 'play'; cardId: string; suit?: Suit } | { type: 'draw' } | { type: 'pass' };

/** What one seat may know. */
export type View = {
  /** The viewer's own hand; empty for a spectator. */
  hand: PlayingCard[];
  handCounts: number[];
  top: PlayingCard;
  suit: Suit;
  deckCount: number;
  turn: Seat;
  drawn: boolean;
};
