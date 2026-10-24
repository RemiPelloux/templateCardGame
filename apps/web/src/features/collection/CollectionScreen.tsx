import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { itemById, RARITIES, SLOTS, type Item } from '@cardgame/meta';
import { economyApi, type InventoryView } from '@cardgame/protocol';
import { Link } from '../../app/Link';
import { keys } from '../../app/query';
import { useI18n } from '../../i18n/I18nProvider';
import { http } from '../../net/http';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { Page } from '../../ui/Page';
import { useAction } from '../../ui/useAction';
import { ItemCard } from '../shop/ItemCard';
import { useItemText } from '../shop/useItemText';
import { useInventory } from '../shop/useShop';

const KINDS = [...SLOTS, 'expansion'] as const;
const ALL = 'all';

type Filters = { kind: string; rarity: string };

function FilterBar({ filters, onChange }: { filters: Filters; onChange(next: Filters): void }) {
  const { t } = useI18n();
  const text = useItemText();
  const select = (name: keyof Filters, values: readonly string[], label: (v: string) => string) => (
    <label className="field field--inline">
      {t(`collection.filters.${name}`)}
      <select
        className="input"
        value={filters[name]}
        onChange={(e) => onChange({ ...filters, [name]: e.target.value })}
      >
        <option value={ALL}>{t('collection.filters.all')}</option>
        {values.map((value) => (
          <option key={value} value={value}>
            {label(value)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="row collection__filters">
      {select('kind', KINDS, text.kind)}
      {select('rarity', RARITIES, text.rarity)}
    </div>
  );
}

const matches = (item: Item, filters: Filters) =>
  (filters.kind === ALL || item.kind === filters.kind) &&
  (filters.rarity === ALL || item.rarity === filters.rarity);

/** Equips through the economy's endpoint and shares the new inventory with every screen. */
function useEquip() {
  const client = useQueryClient();
  return async (item: Item) => {
    const view = await http.post<InventoryView>(economyApi.equip, {
      slot: item.kind,
      item: item.id,
    });
    client.setQueryData(keys.inventory, view);
    return item.id;
  };
}

type GridProps = {
  items: Item[];
  wearing: ReadonlySet<string>;
  busy: boolean;
  onEquip(item: Item): void;
};

/** The owned items; expansions are owned, not worn, so they have nothing to equip. */
function OwnedGrid({ items, wearing, busy, onEquip }: GridProps) {
  const { t } = useI18n();
  const action = (item: Item) => {
    if (item.kind === 'expansion') return <span className="tag">{t('collection.owned')}</span>;
    if (wearing.has(item.id))
      return <span className="tag tag--on">{t('collection.equipped')}</span>;
    return (
      <Button variant="secondary" disabled={busy} onClick={() => onEquip(item)}>
        {t('collection.equip')}
      </Button>
    );
  };
  return (
    <ul className="offers">
      {items.map((item) => (
        <ItemCard key={item.id} id={item.id} current={wearing.has(item.id)}>
          {action(item)}
        </ItemCard>
      ))}
    </ul>
  );
}

/** Everything the member owns, by slot, with what they wear marked and one tap to change it. */
export function CollectionScreen() {
  const { t } = useI18n();
  const text = useItemText();
  const inventory = useInventory();
  const equip = useEquip();
  const { busy, error, run, clearError } = useAction();
  const [filters, setFilters] = useState<Filters>({ kind: ALL, rarity: ALL });
  const [done, setDone] = useState<string | null>(null);
  const owned = (inventory.data?.owned ?? []).map(itemById).filter((i): i is Item => !!i);
  const shown = owned.filter((item) => matches(item, filters));
  const onEquip = (item: Item) => void run(() => equip(item)).then((id) => id && setDone(id));
  return (
    <Page title={t('collection.title')} lede={t('collection.lede')}>
      <FilterBar filters={filters} onChange={setFilters} />
      <Notice message={error} onDismiss={clearError} />
      <Notice
        tone="info"
        message={done ? t('collection.equippedNotice', { name: text.name(done) }) : null}
      />
      {inventory.isPending && <p className="muted">{t('common.status.loading')}</p>}
      <OwnedGrid
        items={shown}
        wearing={new Set(Object.values(inventory.data?.equipped ?? {}))}
        busy={busy}
        onEquip={onEquip}
      />
      {inventory.data && !shown.length && <p className="muted">{t('collection.empty')}</p>}
      <Link to={{ name: 'shop' }}>{t('collection.shopLink')}</Link>
    </Page>
  );
}
