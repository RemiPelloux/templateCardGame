import type { Expansion, ExpansionChoice, MoveContext, Seat } from '@cardgame/engine';
import type { Card, Command, ExpansionData, SpecialCard, State, View } from './types';

/** Anything that knows which expansion it is played with: the state, or a seat's view. */
export type Table = { expansion: ExpansionChoice | null };

/** What playing a card does to the turn, applied by the base rules once the card is down. */
export type PlayEffect = {
  /** The next player draws this many cards (as many as can be drawn). */
  draw?: number;
  /** The next player misses their turn. */
  skip?: boolean;
};

/**
 * The extension points of Crazy Eights: the base rules call each hook an expansion defines, and
 * keep their own behaviour where it defines none. Hooks are pure, like the rules; they may read
 * `state.expansion.rulesVersion` to keep playing older saved matches by their own rules.
 */
export type Hooks = {
  /** Cards shuffled into the deck at the deal, on top of the 52. */
  cards?(): SpecialCard[];
  /** The expansion's own state at the deal. */
  setup?(players: number): ExpansionData;
  /** Whether a card goes on anything and names a suit; undefined keeps the base answer. */
  isWild?(card: Card): boolean | undefined;
  /** Whether a special card that is not wild may be played now (base: never). */
  canPlay?(card: SpecialCard, state: State): boolean;
  /** Called when a card is played and the hand is not empty yet: its effect on the turn. */
  onPlay?(play: { state: State; card: Card; ctx: MoveContext }): PlayEffect | void;
  /** Who plays after `seat` (base: the next seat clockwise). */
  nextSeat?(state: State, seat: Seat): Seat;
  /** Points a card left in hand gives the winner; undefined keeps the base value. */
  penalty?(card: Card): number | undefined;
  /** What `seat` may see of the expansion's state (null: a spectator). Never secrets. */
  view?(state: State, seat: Seat | null): ExpansionData;
  /** Added to the basic bot's score for a legal command. */
  botScore?(command: Command, view: View): number;
};

export type GameExpansion = Expansion<Hooks>;
