import type { CSSProperties, ReactNode } from 'react';
import { itemById } from '@cardgame/meta';
import { useItemText } from './useItemText';

/** The colours an item's look feeds its swatch, by kind: [main, secondary]. */
const SWATCH: Record<string, [string, string]> = {
  cardBack: ['base', 'stripe'],
  felt: ['felt', 'deep'],
  frame: ['ring', 'ring'],
};

/** A small picture of the item: a card back, a piece of felt, a ring; a glyph for expansions. */
export function ItemPreview({ id }: { id: string }) {
  const item = itemById(id);
  const [main, second] = SWATCH[item?.kind ?? ''] ?? [];
  const style = {
    '--swatch-a': main && item?.look?.[main],
    '--swatch-b': second && item?.look?.[second],
  } as CSSProperties;
  return (
    <span className={`swatch swatch--${item?.kind ?? 'unknown'}`} style={style} aria-hidden>
      {item?.kind === 'expansion' ? '✦' : null}
    </span>
  );
}

type Props = { id: string; children?: ReactNode; current?: boolean };

/** An item with its rarity (as a word and a colour), its kind, its description and actions. */
export function ItemCard({ id, children, current }: Props) {
  const text = useItemText();
  const item = itemById(id);
  const rarity = item?.rarity ?? 'common';
  return (
    <li className={`item-card item-card--${rarity} ${current ? 'item-card--current' : ''}`}>
      <ItemPreview id={id} />
      <h3 className="item-card__name">{text.name(id)}</h3>
      <p className="item-card__meta">
        <span className="rarity">{text.rarity(rarity)}</span> · {text.kind(item?.kind ?? '')}
      </p>
      <p className="item-card__description">{text.description(id)}</p>
      <div className="item-card__actions">{children}</div>
    </li>
  );
}
