import type { Seat } from '@cardgame/engine';
import { topCard } from './cards';
import type { State, View } from './types';

/** Your own hand, everyone's card counts and the public piles; never the deck or other hands. */
export function view(state: State, seat: Seat | null): View {
  return {
    hand: seat === null ? [] : (state.hands[seat] ?? []).map((card) => ({ ...card })),
    handCounts: state.hands.map((hand) => hand.length),
    top: { ...topCard(state) },
    suit: state.suit,
    deckCount: state.deck.length,
    turn: state.turn,
    drawn: state.drawn,
  };
}
