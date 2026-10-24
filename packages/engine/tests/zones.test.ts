import { describe, expect, it } from 'vitest';
import {
  drawFrom,
  moveById,
  readOneOf,
  readString,
  RuleError,
  standardDeck,
  takeById,
  topOf,
} from '../src';

describe('zones', () => {
  it('draws from the top (the end) of a pile', () => {
    const pile = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(drawFrom(pile, 2).map((c) => c.id)).toEqual(['c', 'b']);
    expect(pile).toEqual([{ id: 'a' }]);
    expect(drawFrom(pile, 5)).toHaveLength(1);
  });

  it('takes and moves by id, refusing unknown cards', () => {
    const from = [{ id: 'a' }, { id: 'b' }];
    const to: { id: string }[] = [];
    moveById(from, to, 'b');
    expect(topOf(to)?.id).toBe('b');
    expect(() => takeById(from, 'zzz')).toThrow(RuleError);
  });

  it('builds a 52-card deck with unique ids', () => {
    const deck = standardDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
    expect(new Set(standardDeck(2).map((c) => c.id)).size).toBe(104);
  });
});

describe('guards', () => {
  it('read typed values or throw a RuleError', () => {
    expect(readOneOf('a', ['a', 'b'] as const, 'x')).toBe('a');
    expect(() => readOneOf('c', ['a', 'b'] as const, 'x')).toThrow(RuleError);
    expect(() => readString('', 'name')).toThrow(RuleError);
    expect(() => readString('x'.repeat(5), 'name', 4)).toThrow(RuleError);
  });
});
