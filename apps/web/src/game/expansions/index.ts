import type { Card } from '@cardgame/game';
import { jokersUi } from './jokers';
import type { ExpansionUi, SpecialCardUi } from './types';

/**
 * The web half of every expansion, matching packages/game/src/expansions. Adding one is a
 * folder here, its bundle in i18n/messages.ts and one line in this list.
 */
export const EXPANSION_UIS: readonly ExpansionUi[] = [jokersUi];

const byId = new Map(EXPANSION_UIS.map((ui) => [ui.id, ui]));
const cardsByKind = new Map(EXPANSION_UIS.flatMap((ui) => Object.entries(ui.cards)));

export const expansionUi = (id: string | null | undefined) => (id ? byId.get(id) : undefined);

/** How to draw an expansion's card, whichever expansion it belongs to. */
export const specialCardUi = (card: Card): SpecialCardUi | undefined =>
  'special' in card ? cardsByKind.get(card.special) : undefined;

export type { ExpansionUi, SpecialCardUi } from './types';
