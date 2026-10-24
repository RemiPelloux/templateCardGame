import {
  createMatch,
  RANKS,
  SUITS,
  type PlayingCard,
  type Rank,
  type Suit,
} from '@cardgame/engine';
import { game, type State } from '../src';

/** `card('QH')` is the queen of hearts, `card('10S')` the ten of spades. */
export function card(id: string): PlayingCard {
  const rank = id.slice(0, -1) as Rank;
  const suit = SUITS.find((s) => s[0]!.toUpperCase() === id.slice(-1)) as Suit;
  if (!RANKS.includes(rank) || !suit) throw new Error(`Bad card ${id}`);
  return { id, rank, suit };
}
export const cards = (ids: string) => ids.split(' ').filter(Boolean).map(card);

/** A dealt match whose state is replaced by a hand-written position. */
export function position(state: Partial<State> & Pick<State, 'hands'>) {
  const match = createMatch(game, { players: state.hands.length, seed: 1 });
  const top = state.discard?.at(-1) ?? match.state.discard.at(-1)!;
  match.state = {
    ...match.state,
    deck: [],
    discard: [top],
    suit: top.suit,
    turn: 0,
    drawn: false,
    blockedPasses: 0,
    ...state,
  };
  return match;
}
