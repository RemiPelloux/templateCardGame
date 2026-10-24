import type { CSSProperties } from 'react';
import { itemById } from '@cardgame/meta';
import { useInventory } from '../shop/useShop';

/** Which look entry feeds which table token, per slot the viewer's own table shows. */
const TOKENS: Record<string, Record<string, string>> = {
  felt: { felt: '--felt', deep: '--felt-deep' },
  cardBack: { base: '--card-back', stripe: '--card-back-pattern' },
};

/**
 * The CSS variables of an equipped felt and card back. Starters set nothing, so the theme's own
 * tokens (and their dark-mode values) stay in charge until the member picks something else.
 */
export function lookStyle(equipped: Record<string, string> | undefined): CSSProperties | undefined {
  const style: Record<string, string> = {};
  for (const [slot, tokens] of Object.entries(TOKENS)) {
    const item = itemById(equipped?.[slot] ?? '');
    if (!item?.look || item.starter) continue;
    for (const [entry, token] of Object.entries(tokens))
      if (item.look[entry]) style[token] = item.look[entry];
  }
  return Object.keys(style).length ? (style as CSSProperties) : undefined;
}

/** The ring colour of a frame, or undefined for none (bots, the starter frame). */
export const frameRing = (frame: string | undefined): string | undefined => {
  const item = frame ? itemById(frame) : undefined;
  return item?.kind === 'frame' && !item.starter ? item.look?.ring : undefined;
};

/** The signed-in viewer's felt and card back, for the table they look at (practice or online). */
export function useTableLooks() {
  return lookStyle(useInventory().data?.equipped);
}
