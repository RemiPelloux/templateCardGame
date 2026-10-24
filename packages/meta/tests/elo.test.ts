import { describe, expect, it } from 'vitest';
import {
  applyElo,
  ELO_K,
  ELO_START,
  eloDelta,
  expectedScore,
  isProvisional,
  PROVISIONAL_GAMES,
} from '../src';

describe('elo', () => {
  it('expects an even game between equal ratings, and 10:1 at a 400-point gap', () => {
    expect(expectedScore(ELO_START, ELO_START)).toBe(0.5);
    expect(expectedScore(1400, 1000) / expectedScore(1000, 1400)).toBeCloseTo(10);
  });

  it('moves equal ratings by half of K on a win and not at all on a draw', () => {
    expect(eloDelta({ a: 1000, b: 1000, scoreA: 1 })).toBe(ELO_K / 2);
    expect(eloDelta({ a: 1000, b: 1000, scoreA: 0 })).toBe(-ELO_K / 2);
    expect(eloDelta({ a: 1000, b: 1000, scoreA: 0.5 })).toBe(0);
  });

  it('rewards an upset more than an expected win', () => {
    expect(eloDelta({ a: 1000, b: 1400, scoreA: 1 })).toBe(29);
    expect(eloDelta({ a: 1400, b: 1000, scoreA: 1 })).toBe(3);
  });

  it('never creates or destroys points', () => {
    for (const [a, b] of [
      [1000, 1000],
      [1213, 987],
      [700, 1650],
      [1501, 1499],
    ] as const)
      for (const scoreA of [0, 0.5, 1] as const) {
        const next = applyElo({ a, b, scoreA });
        expect(next.a + next.b).toBe(a + b);
        expect(Math.abs(next.delta)).toBeLessThanOrEqual(ELO_K);
      }
  });

  it('keeps a rating provisional for the first games', () => {
    expect(isProvisional(0)).toBe(true);
    expect(isProvisional(PROVISIONAL_GAMES - 1)).toBe(true);
    expect(isProvisional(PROVISIONAL_GAMES)).toBe(false);
  });
});
