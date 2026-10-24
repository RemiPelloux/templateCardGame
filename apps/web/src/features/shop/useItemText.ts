import { hasMessage, type Catalog } from '@cardgame/i18n';
import { useI18n } from '../../i18n/I18nProvider';
import { messages } from '../../i18n/messages';

type Key = Parameters<ReturnType<typeof useI18n>['t']>[0];

/**
 * Names of items, boosters and rarities, looked up by id. Ids come from data, so the keys are
 * dynamic: an id without text (an item added without translating it) shows the id itself.
 */
export function useItemText() {
  const { t, locale } = useI18n();
  const text = (key: string, fallback: string) =>
    hasMessage(messages[locale] as Catalog, key) ? t(key as Key) : fallback;
  return {
    name: (id: string) => text(`shop.items.${id}.name`, id),
    description: (id: string) => text(`shop.items.${id}.description`, ''),
    boosterName: (id: string) => text(`shop.boosters.${id}.name`, id),
    boosterDescription: (id: string) => text(`shop.boosters.${id}.description`, ''),
    rarity: (rarity: string) => text(`shop.rarity.${rarity}`, rarity),
    kind: (kind: string) => text(`shop.kinds.${kind}`, kind),
  };
}
