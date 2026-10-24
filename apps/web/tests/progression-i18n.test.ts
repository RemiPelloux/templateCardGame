import { describe, expect, it } from 'vitest';
import { hasMessage, LOCALE_IDS, type Catalog } from '@cardgame/i18n';
import { ACHIEVEMENTS, MISSIONS } from '@cardgame/meta';
import { messages } from '../src/i18n/messages';

describe('progression text', () => {
  it.each(LOCALE_IDS)('%s names every mission and achievement', (locale) => {
    const catalog = messages[locale] as Catalog;
    const keys = [
      ...MISSIONS.map((m) => `progression.missions.ids.${m.id}`),
      ...ACHIEVEMENTS.flatMap((a) => [
        `progression.achievements.ids.${a.id}.name`,
        `progression.achievements.ids.${a.id}.text`,
      ]),
    ];
    expect(keys.filter((key) => !hasMessage(catalog, key))).toEqual([]);
  });
});
