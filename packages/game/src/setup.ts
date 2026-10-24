import { drawFrom, standardDeck, type SetupContext } from '@cardgame/engine';
import { isStandard } from './card-kinds';
import { dealSize, isWild } from './cards';
import { hooksOf, tableOf } from './extension';
import type { Table } from './hooks';
import type { Options, State } from './types';

/**
 * Buries a wild card turned up as the starter somewhere in the deck, as the classic rules say;
 * an expansion's own cards too, so the game always starts on a standard card and its suit.
 */
function turnStarter(deck: State['deck'], ctx: SetupContext<Options>, table: Table) {
  for (;;) {
    const [card] = drawFrom(deck, 1);
    if (!card) throw new Error('The deck ran out before a starter card.');
    if (isStandard(card) && !isWild(card, table)) return card;
    deck.splice(ctx.rng.int(deck.length + 1), 0, card);
  }
}

export function setup(ctx: SetupContext<Options>): State {
  const table = tableOf(ctx.options);
  const hooks = hooksOf(table);
  const deck = ctx.rng.shuffle([...standardDeck(), ...(hooks.cards?.() ?? [])]);
  const size = dealSize(ctx.players, ctx.options.handSize);
  const hands = Array.from({ length: ctx.players }, () => drawFrom(deck, size));
  const starter = turnStarter(deck, ctx, table);
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
    expansion: table.expansion,
    expansionState: hooks.setup?.(ctx.players) ?? null,
  };
}
