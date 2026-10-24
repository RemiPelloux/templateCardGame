import { describe, expect, it } from 'vitest';
import { createExpansionRegistry, RuleError, type Expansion } from '../src';

type Hooks = { bonus: number };
const box = (id: string, rulesVersion: number, oldestRulesVersion = 1): Expansion<Hooks> => ({
  manifest: { id, rulesVersion, oldestRulesVersion, item: `expansion-${id}` },
  hooks: { bonus: rulesVersion },
});

describe('expansion registry', () => {
  const registry = createExpansionRegistry([box('jokers', 3, 2), box('wild-west', 1)]);

  it('indexes expansions by id', () => {
    expect(registry.ids).toEqual(['jokers', 'wild-west']);
    expect(registry.get('jokers')?.hooks.bonus).toBe(3);
    expect(registry.get('nope')).toBeUndefined();
    expect(registry.isId('wild-west')).toBe(true);
    expect(registry.isId(42)).toBe(false);
  });

  it('plays the current rules by default and keeps any still-supported version', () => {
    expect(registry.playableVersion('jokers')).toBe(3);
    expect(registry.playableVersion('jokers', 2)).toBe(2);
    expect(() => registry.playableVersion('jokers', 1)).toThrow(RuleError);
    expect(() => registry.playableVersion('jokers', 4)).toThrow(/no longer/);
    expect(() => registry.playableVersion('nope')).toThrow(/does not exist/);
  });

  it('reads untrusted options into a choice', () => {
    expect(registry.read(null)).toBeNull();
    expect(registry.read(undefined, 7)).toBeNull();
    expect(registry.read('jokers')).toEqual({ id: 'jokers', rulesVersion: 3 });
    expect(registry.read('jokers', 2)).toEqual({ id: 'jokers', rulesVersion: 2 });
    expect(() => registry.read('jokers', '2')).toThrow(RuleError);
    expect(() => registry.read({ id: 'jokers' })).toThrow(RuleError);
  });

  it('refuses inconsistent manifests', () => {
    expect(() => createExpansionRegistry([box('a', 1), box('a', 2)])).toThrow(/share/);
    expect(() => createExpansionRegistry([box('a', 1, 2)])).toThrow(/oldestRulesVersion/);
    expect(() => createExpansionRegistry([box('Not Kebab', 1)])).toThrow(/kebab/);
  });
});
