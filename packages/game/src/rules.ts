import {
  drawFrom,
  RuleError,
  SUITS,
  takeById,
  type MoveContext,
  type Seat,
} from '@cardgame/engine';
import { isStandard } from './card-kinds';
import { canPlay, drawable, isWild } from './cards';
import { hooksOf } from './extension';
import type { PlayEffect } from './hooks';
import type { Command, State } from './types';

function nextTurn(state: State) {
  const after = hooksOf(state).nextSeat;
  state.turn = after ? after(state, state.turn) : (state.turn + 1) % state.hands.length;
  state.drawn = false;
}

/** Shuffles the discard pile, all but its top card, back into an empty deck. */
function refillDeck(state: State, ctx: MoveContext) {
  if (state.deck.length) return;
  const top = state.discard.pop()!;
  state.deck = ctx.rng.shuffle(state.discard);
  state.discard = [top];
  ctx.log('reshuffle', { count: state.deck.length }, { seat: null });
}

/** One card from the deck into `seat`'s hand. */
function drawCard(state: State, seat: Seat, ctx: MoveContext) {
  refillDeck(state, ctx);
  const [card] = drawFrom(state.deck, 1);
  state.hands[seat]!.push(card!);
  return card!;
}

/** Passes the turn, then applies a played card's effect to the player it lands on. */
function endTurn(state: State, effect: PlayEffect, ctx: MoveContext) {
  nextTurn(state);
  const victim = state.turn;
  const count = Math.min(effect.draw ?? 0, drawable(state));
  if (count > 0) {
    ctx.log('forcedDraw', { count }, { seat: victim });
    for (let i = 0; i < count; i++) {
      const card = drawCard(state, victim, ctx);
      ctx.log('drew', { card }, { seat: victim, visibleTo: [victim] });
    }
  }
  if (!effect.skip) return;
  ctx.log('skip', undefined, { seat: victim });
  nextTurn(state);
}

function play(state: State, command: Extract<Command, { type: 'play' }>, ctx: MoveContext) {
  const hand = state.hands[ctx.seat]!;
  const card = hand.find((c) => c.id === command.cardId);
  if (!card) throw new RuleError('That card is not in your hand.', 'CARD_NOT_FOUND');
  if (!canPlay(state, card))
    throw new RuleError('Follow the suit or the rank, or play an eight.', 'CANNOT_PLAY');
  const wild = isWild(card, state);
  if (wild && !command.suit)
    throw new RuleError('Name a suit for your wild card.', 'SUIT_REQUIRED');
  state.discard.push(takeById(hand, card.id));
  if (wild) state.suit = command.suit!;
  else if (isStandard(card)) state.suit = card.suit;
  state.blockedPasses = 0;
  ctx.log('play', wild ? { card, suit: state.suit } : { card });
  if (hand.length) endTurn(state, hooksOf(state).onPlay?.({ state, card, ctx }) ?? {}, ctx);
}

function draw(state: State, ctx: MoveContext) {
  if (state.drawn) throw new RuleError('You have already drawn this turn.', 'ALREADY_DRAWN');
  if (drawable(state) <= 0) throw new RuleError('Nothing left to draw: pass.', 'NOTHING_TO_DRAW');
  const card = drawCard(state, ctx.seat, ctx);
  state.drawn = true;
  state.blockedPasses = 0;
  ctx.log('draw', { count: 1 });
  ctx.log('drew', { card }, { visibleTo: [ctx.seat] });
}

function pass(state: State, ctx: MoveContext) {
  const blocked = drawable(state) <= 0;
  if (!state.drawn && !blocked) throw new RuleError('Draw a card before passing.', 'MUST_DRAW');
  if (blocked && !state.drawn) state.blockedPasses++;
  ctx.log('pass');
  nextTurn(state);
}

export function apply(state: State, command: Command, ctx: MoveContext) {
  if (command.type === 'play') play(state, command, ctx);
  else if (command.type === 'draw') draw(state, ctx);
  else pass(state, ctx);
}

/** Every command `seat` may send; it must agree exactly with `apply` (tests check it does). */
export function legalCommands(state: State, seat: Seat): Command[] {
  if (seat !== state.turn) return [];
  const plays = state.hands[seat]!.filter((card) => canPlay(state, card)).flatMap(
    (card): Command[] =>
      isWild(card, state)
        ? SUITS.map((suit) => ({ type: 'play', cardId: card.id, suit }))
        : [{ type: 'play', cardId: card.id }],
  );
  const canDraw = !state.drawn && drawable(state) > 0;
  const canPass = state.drawn || drawable(state) <= 0;
  return [
    ...plays,
    ...(canDraw ? [{ type: 'draw' } as const] : []),
    ...(canPass ? [{ type: 'pass' } as const] : []),
  ];
}

export const actors = (state: State): Seat[] => [state.turn];
