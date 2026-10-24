import { drawFrom, standardDeck, type SetupContext } from '@cardgame/engine';
import { dealSize, isWild } from './cards';
import type { Options, State } from './types';

/** Buries an eight turned up as the starter somewhere in the deck, as the classic rules say. */
function turnStarter(deck: State['deck'], ctx: SetupContext<Options>) {
  for (;;) {
    const [card] = drawFrom(deck, 1);
    if (!card) throw new Error('The deck ran out before a starter card.');
    if (!isWild(card)) return card;
    deck.splice(ctx.rng.int(deck.length + 1), 0, card);
  }
}

export function setup(ctx: SetupContext<Options>): State {
  const deck = ctx.rng.shuffle(standardDeck());
  const size = dealSize(ctx.players, ctx.options.handSize);
  const hands = Array.from({ length: ctx.players }, () => drawFrom(deck, size));
  const starter = turnStarter(deck, ctx);
  ctx.log('deal', { handSize: size });
  ctx.log('starter', { card: starter });
  return {
    hands,
    deck,
    discard: [starter],
    suit: starter.suit,
    turn: 0,
    drawn: false,
    blockedPasses: 0,
  };
}
