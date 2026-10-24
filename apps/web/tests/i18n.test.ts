import { describe, expect, it } from 'vitest';
import { LOCALE_IDS, missingKeys, type Catalog } from '@cardgame/i18n';
import { messages } from '../src/i18n/messages';

describe('translations', () => {
  it.each(LOCALE_IDS.filter((l) => l !== 'en'))('%s has every English key', (locale) => {
    expect(missingKeys(messages.en as Catalog, messages[locale] as Catalog)).toEqual([]);
  });

  it.each(LOCALE_IDS)('%s keeps the placeholders of each English message', (locale) => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    const walk = (en: Catalog, other: Catalog, path: string[] = []): string[] =>
      Object.entries(en).flatMap(([key, value]) => {
        const counterpart = other[key];
        if (typeof value === 'string')
          return JSON.stringify(placeholders(value)) ===
            JSON.stringify(placeholders(String(counterpart)))
            ? []
            : [[...path, key].join('.')];
        if ('other' in value && typeof value.other === 'string')
          return JSON.stringify(placeholders(value.other)) ===
            JSON.stringify(placeholders(String((counterpart as Catalog).other)))
            ? []
            : [[...path, key].join('.')];
        return walk(value as Catalog, counterpart as Catalog, [...path, key]);
      });
    expect(walk(messages.en as Catalog, messages[locale] as Catalog)).toEqual([]);
  });
});
