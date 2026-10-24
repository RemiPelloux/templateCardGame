import { describe, expect, it } from 'vitest';
import { BOOSTERS, ITEMS, RARITIES, SLOTS } from '@cardgame/meta';
import { frameRing, lookStyle } from '../src/features/collection/looks';
import { messages } from '../src/i18n/messages';

describe('shop text', () => {
  it('names every item, booster, rarity and kind', () => {
    const { shop } = messages.en;
    for (const item of ITEMS) expect(shop.items).toHaveProperty([item.id, 'name']);
    for (const booster of BOOSTERS) expect(shop.boosters).toHaveProperty([booster.id, 'name']);
    for (const rarity of RARITIES) expect(shop.rarity).toHaveProperty(rarity);
    for (const kind of [...SLOTS, 'expansion']) expect(shop.kinds).toHaveProperty(kind);
  });
});

describe('table looks', () => {
  it('turns an equipped felt and card back into table tokens, leaving starters to the theme', () => {
    expect(lookStyle({ felt: 'felt-green', cardBack: 'back-ember', frame: 'frame-none' })).toBe(
      undefined,
    );
    expect(lookStyle({ felt: 'felt-navy', cardBack: 'back-gold' })).toEqual({
      '--felt': '#1e3a5f',
      '--felt-deep': '#0f2440',
      '--card-back': '#713f12',
      '--card-back-pattern': '#eab308',
    });
  });

  it('rings a seat only for a real frame', () => {
    expect(frameRing('frame-silver')).toBe('#94a3b8');
    expect(frameRing('frame-none')).toBeUndefined();
    expect(frameRing('back-ocean')).toBeUndefined();
    expect(frameRing(undefined)).toBeUndefined();
  });
});
