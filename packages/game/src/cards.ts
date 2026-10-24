import { topOf, type Rank } from '@cardgame/engine';
import { isStandard } from './card-kinds';
import {
  ACE_PENALTY,
  FACE_PENALTY,
  FACE_RANKS,
  HAND_SIZE_GROUP,
  HAND_SIZE_HEADS_UP,
  WILD_PENALTY,
  WILD_RANK,
} from './constants';
import { CLASSIC, hooksOf } from './extension';
import type { Table } from './hooks';
import type { Card, State } from './types';

/** Eights, and whatever the table's expansion makes wild. */
export function isWild(card: Card, table: Table = CLASSIC): boolean {
  const base = isStandard(card) && card.rank === WILD_RANK;
  return hooksOf(table).isWild?.(card) ?? base;
}

export function topCard(state: State): Card {
  const top = topOf(state.discard);
  if (!top) throw new Error('The discard pile is never empty once dealt.');
  return top;
}

/** A wild card goes on anything; any other card must follow the suit or match the top's rank. */
export function canPlay(state: State, card: Card): boolean {
  if (isWild(card, state)) return true;
  if (!isStandard(card)) return hooksOf(state).canPlay?.(card, state) ?? false;
  const top = topCard(state);
  return card.suit === state.suit || (isStandard(top) && card.rank === top.rank);
}

function basePenalty(card: Card, table: Table): number {
  if (isWild(card, table)) return WILD_PENALTY;
  if (!isStandard(card)) return 0;
  if (FACE_RANKS.includes(card.rank)) return FACE_PENALTY;
  if (card.rank === 'A') return ACE_PENALTY;
  return Number(card.rank as Exclude<Rank, 'A' | 'J' | 'Q' | 'K'>);
}

/** Points a card left in hand is worth to the winner. */
export const penalty = (card: Card, table: Table = CLASSIC): number =>
  hooksOf(table).penalty?.(card) ?? basePenalty(card, table);

export const handPenalty = (hand: readonly Card[], table: Table = CLASSIC) =>
  hand.reduce((sum, card) => sum + penalty(card, table), 0);

export const dealSize = (players: number, handSize: number | null) =>
  handSize ?? (players === 2 ? HAND_SIZE_HEADS_UP : HAND_SIZE_GROUP);

/** Cards that could still be drawn: the deck, plus the discard pile under its top card. */
export const drawable = (state: State) => state.deck.length + state.discard.length - 1;
