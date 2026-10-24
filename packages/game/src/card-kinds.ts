import type { PlayingCard } from '@cardgame/engine';
import type { Card, SpecialCard } from './types';

/** A card of the standard deck, as opposed to an expansion's own card. */
export const isStandard = (card: Card): card is PlayingCard => !('special' in card);

/** An expansion's card of the given kind (`isSpecial(card, 'joker')`). */
export const isSpecial = (card: Card, kind: string): card is SpecialCard =>
  'special' in card && card.special === kind;
