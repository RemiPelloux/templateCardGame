import { describe, expect, it } from 'vitest';
import { defaultFor, ITEMS, SLOTS } from '../src';

describe('item catalog', () => {
  it('has unique, kebab-case ids', () => {
    const ids = ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('gives every slot exactly one starter', () => {
    for (const slot of SLOTS) {
      expect(ITEMS.filter((i) => i.kind === slot && i.starter)).toHaveLength(1);
      expect(defaultFor(slot)).toBeTruthy();
    }
  });
});
