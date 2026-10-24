import type { ExpansionChoice, PlayingCard, Seat, Suit } from '@cardgame/engine';

/** A card only an expansion knows (a joker): its rules come from the expansion's hooks. */
export type SpecialCard = { id: string; special: string };
/** A standard card, or an expansion's own. Without an expansion every card is standard. */
export type Card = PlayingCard | SpecialCard;
/** An expansion's own state (direction of play, counters…): plain JSON. */
export type ExpansionData = Record<string, unknown>;

export type Options = {
  /** Cards dealt to each player; null deals the classic amount (7 for two players, 5 otherwise). */
  handSize: number | null;
  /** The expansion played with the base game, or null for the classic game. */
  expansion: string | null;
  /** The expansion's rules version the match was dealt with; null without an expansion. */
  expansionRules: number | null;
};

/** The full, secret state. Only the engine and the rules ever read it. */
export type State = {
  hands: Card[][];
  /** Face down; the top card is the last one. */
  deck: Card[];
  /** Face up; the top card is the last one. */
  discard: Card[];
  /** The suit to follow: the top card's, or the one named with an eight. */
  suit: Suit;
  turn: Seat;
  /** The player to move has already drawn this turn. */
  drawn: boolean;
  /** Passes in a row with nothing left to draw: once everyone has passed, the game is blocked. */
  blockedPasses: number;
  /** The expansion this match was dealt with, and its rules version; null for the classic game. */
  expansion: ExpansionChoice | null;
  /** The expansion's own state, null without one. */
  expansionState: ExpansionData | null;
};

export type Command =
  { type: 'play'; cardId: string; suit?: Suit } | { type: 'draw' } | { type: 'pass' };

/** What one seat may know. */
export type View = {
  /** The viewer's own hand; empty for a spectator. */
  hand: Card[];
  handCounts: number[];
  top: Card;
  suit: Suit;
  deckCount: number;
  turn: Seat;
  drawn: boolean;
  expansion: ExpansionChoice | null;
  /** What this seat may see of the expansion's state. */
  expansionView: ExpansionData | null;
};
