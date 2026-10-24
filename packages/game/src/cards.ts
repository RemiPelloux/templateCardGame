import { topOf, type PlayingCard, type Rank } from '@cardgame/engine';
import {
  ACE_PENALTY,
  FACE_PENALTY,
  FACE_RANKS,
  HAND_SIZE_GROUP,
  HAND_SIZE_HEADS_UP,
  WILD_PENALTY,
  WILD_RANK,
} from './constants';
import type { State } from './types';

export const isWild = (card: PlayingCard) => card.rank === WILD_RANK;

export function topCard(state: State): PlayingCard {
  const top = topOf(state.discard);
  if (!top) throw new Error('The discard pile is never empty once dealt.');
  return top;
}

/** An eight goes on anything; any other card must follow the suit or match the top's rank. */
export const canPlay = (state: State, card: PlayingCard) =>
  isWild(card) || card.suit === state.suit || card.rank === topCard(state).rank;

/** Points a card left in hand is worth to the winner. */
export function penalty(card: PlayingCard): number {
  if (isWild(card)) return WILD_PENALTY;
  if (FACE_RANKS.includes(card.rank)) return FACE_PENALTY;
  if (card.rank === 'A') return ACE_PENALTY;
  return Number(card.rank as Exclude<Rank, 'A' | 'J' | 'Q' | 'K'>);
}

export const handPenalty = (hand: readonly PlayingCard[]) =>
  hand.reduce((sum, card) => sum + penalty(card), 0);

export const dealSize = (players: number, handSize: number | null) =>
  handSize ?? (players === 2 ? HAND_SIZE_HEADS_UP : HAND_SIZE_GROUP);

/** Cards that could still be drawn: the deck, plus the discard pile under its top card. */
export const drawable = (state: State) => state.deck.length + state.discard.length - 1;
