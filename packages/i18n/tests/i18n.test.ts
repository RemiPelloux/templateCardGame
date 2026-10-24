import { describe, expect, it } from 'vitest';
import { createTranslator, defineBundle, mergeBundles, missingKeys, negotiateLocale } from '../src';

const lobby = defineBundle({
  en: {
    title: 'Table {code}',
    cards: { one: '{count} card', other: '{count} cards' },
    seats: { bot: 'Bot {n}' },
  },
  fr: {
    title: 'Table {code}',
    cards: { one: '{count} carte', other: '{count} cartes' },
    seats: { bot: 'IA {n}' },
  },
});

describe('translator', () => {
  const messages = mergeBundles({ lobby });
  const en = createTranslator('en', messages.en);
  const fr = createTranslator('fr', messages.fr, messages.en);

  it('fills placeholders and formats numbers for the locale', () => {
    expect(en('lobby.title', { code: 'ABCDE' })).toBe('Table ABCDE');
    expect(en('lobby.cards', { count: 1200 })).toBe('1,200 cards');
    expect(fr('lobby.cards', { count: 1200 })).toBe('1 200 cartes');
  });

  it('follows each language’s plural rules', () => {
    expect(en('lobby.cards', { count: 1 })).toBe('1 card');
    expect(en('lobby.cards', { count: 0 })).toBe('0 cards');
    // French uses the singular for zero and one.
    expect(fr('lobby.cards', { count: 0 })).toBe('0 carte');
    expect(fr('lobby.seats.bot', { n: 2 })).toBe('IA 2');
  });

  it('shows the key when a message is missing instead of crashing', () => {
    expect(en('lobby.nope' as never)).toBe('lobby.nope');
  });
});

describe('locales', () => {
  it('negotiates from browser preferences', () => {
    expect(negotiateLocale(['fr-CA', 'en'])).toBe('fr');
    expect(negotiateLocale(['de-DE', 'en-US'])).toBe('en');
    expect(negotiateLocale(['ja'])).toBe('en');
  });

  it('reports keys a locale lacks', () => {
    expect(missingKeys({ a: 'x', b: { c: 'y' } }, { a: 'x', b: {} })).toEqual(['b.c']);
  });
});
