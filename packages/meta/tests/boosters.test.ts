import { describe, expect, it } from 'vitest';
import { createRng } from '@cardgame/engine';
import {
  BOOSTER_POOL,
  BOOSTERS,
  boosterById,
  DUPLICATE_REFUND,
  openBooster,
  RARITIES,
  type Rarity,
} from '../src';

const SEED = 20261024;
const OPENINGS = 4000;
/** How far an observed rarity share may drift from its weight over OPENINGS packs. */
const TOLERANCE = 0.02;

const seeded = (seed = SEED) => {
  const rng = createRng({ rng: seed });
  return () => rng.next();
};
const standard = boosterById('booster-standard')!;

describe('booster catalog', () => {
  it('has unique ids and something to reveal', () => {
    expect(new Set(BOOSTERS.map((b) => b.id)).size).toBe(BOOSTERS.length);
    for (const booster of BOOSTERS) {
      expect(booster.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(RARITIES.some((r) => booster.weights[r] > 0 && BOOSTER_POOL[r].length)).toBe(true);
    }
  });

  it('never reveals starters or expansions', () => {
    for (const rarity of RARITIES)
      for (const item of BOOSTER_POOL[rarity]) {
        expect(item.starter).toBeUndefined();
        expect(item.kind).not.toBe('expansion');
      }
  });

  it('refunds less than a pack costs, on average, once everything is owned', () => {
    for (const booster of BOOSTERS) {
      const weight = RARITIES.reduce((sum, r) => sum + booster.weights[r], 0);
      const perReveal = RARITIES.reduce(
        (sum, r) => sum + (booster.weights[r] / weight) * DUPLICATE_REFUND[r],
        0,
      );
      expect(perReveal * booster.reveals).toBeLessThan(booster.price);
    }
  });
});

describe('openBooster', () => {
  it('is reproducible from a seed', () => {
    expect(openBooster(standard, seeded(), [])).toEqual(openBooster(standard, seeded(), []));
  });

  it('follows the rarity weights', () => {
    const counts = Object.fromEntries(RARITIES.map((r) => [r, 0])) as Record<Rarity, number>;
    const random = seeded();
    for (let i = 0; i < OPENINGS; i++)
      for (const reveal of openBooster(standard, random, []).reveals) counts[reveal.rarity]++;
    const total = OPENINGS * standard.reveals;
    const weight = RARITIES.reduce((sum, r) => sum + standard.weights[r], 0);
    for (const rarity of RARITIES)
      expect(Math.abs(counts[rarity] / total - standard.weights[rarity] / weight)).toBeLessThan(
        TOLERANCE,
      );
  });

  it('reveals items the member lacks while a rarity has some left', () => {
    const random = seeded();
    for (let i = 0; i < OPENINGS; i++) {
      const { reveals, refund } = openBooster(standard, random, []);
      const ids = reveals.map((r) => r.item);
      const repeats = ids.length - new Set(ids).size;
      expect(reveals.filter((r) => r.duplicate)).toHaveLength(repeats);
      expect(refund).toBe(reveals.reduce((sum, r) => sum + r.refund, 0));
    }
  });

  it('refunds duplicates by rarity once everything is owned', () => {
    const everything = RARITIES.flatMap((r) => BOOSTER_POOL[r].map((item) => item.id));
    const { reveals, refund } = openBooster(standard, seeded(), everything);
    expect(reveals.every((r) => r.duplicate && r.refund === DUPLICATE_REFUND[r.rarity])).toBe(true);
    expect(refund).toBeGreaterThan(0);
  });

  it('leaves out rarities weighted zero', () => {
    const premium = boosterById('booster-premium')!;
    const random = seeded();
    for (let i = 0; i < OPENINGS; i++)
      expect(openBooster(premium, random, []).reveals.some((r) => r.rarity === 'common')).toBe(
        false,
      );
  });
});
