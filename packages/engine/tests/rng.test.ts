import { describe, expect, it } from 'vitest';
import { createRng, deriveSeed, randomSeed } from '../src';

const SAMPLES = 1000;

describe('rng', () => {
  it('replays the same sequence from the same seed', () => {
    const a = createRng({ rng: 42 });
    const b = createRng({ rng: 42 });
    expect(Array.from({ length: 10 }, () => a.next())).toEqual(
      Array.from({ length: 10 }, () => b.next()),
    );
  });

  it('keeps its state in the holder, so a saved match resumes the same sequence', () => {
    const holder = { rng: 7 };
    const rng = createRng(holder);
    rng.next();
    const resumed = createRng({ rng: holder.rng });
    expect(resumed.next()).toBe(rng.next());
  });

  it('stays within bounds', () => {
    const rng = createRng({ rng: 1 });
    for (let i = 0; i < SAMPLES; i++) {
      const value = rng.int(6);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(6);
    }
  });

  it('shuffles into a permutation of the same items', () => {
    const items = Array.from({ length: 52 }, (_, i) => i);
    const shuffled = createRng({ rng: 9 }).shuffle([...items]);
    expect(shuffled).not.toEqual(items);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
  });

  it('refuses to pick from nothing', () => {
    expect(() => createRng({ rng: 1 }).pick([])).toThrow();
  });

  it('derives distinct seeds from distinct inputs', () => {
    expect(deriveSeed(1, 2, 3)).not.toBe(deriveSeed(1, 2, 4));
    expect(deriveSeed(1, 2, 3)).toBe(deriveSeed(1, 2, 3));
    expect(Number.isInteger(randomSeed())).toBe(true);
  });
});
