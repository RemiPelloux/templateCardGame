import { defaultFor, isItemId, itemById, SLOTS, STARTER_ITEMS, type Slot } from '@cardgame/meta';
import type { InventoryView } from '@cardgame/protocol';
import type { Db } from '../../core/database';
import { ApiError } from '../../core/http/errors';

/**
 * Items a member owns (`@cardgame/meta` catalog) and what they wear in each slot. Starter items
 * are owned by everyone without a row. Granting is idempotent: owning twice is owning once.
 */
export class Inventory {
  constructor(
    private db: Db,
    private now: () => number,
  ) {}

  owns(accountId: string, itemId: string): boolean {
    if (STARTER_ITEMS.includes(itemId)) return true;
    return !!this.db
      .prepare('SELECT 1 FROM inventory WHERE account_id = ? AND item_id = ?')
      .get(accountId, itemId);
  }

  /** Gives an item; false when the member already had it. `source`: `shop`, `booster`, `reward`… */
  grant(accountId: string, itemId: string, source: string): boolean {
    if (!isItemId(itemId)) throw new Error(`Unknown item ${itemId}`);
    if (STARTER_ITEMS.includes(itemId)) return false;
    return (
      this.db
        .prepare('INSERT OR IGNORE INTO inventory VALUES (?, ?, ?, ?)')
        .run(accountId, itemId, source, this.now()).changes > 0
    );
  }

  owned(accountId: string): string[] {
    const rows = this.db
      .prepare('SELECT item_id FROM inventory WHERE account_id = ? ORDER BY acquired')
      .all(accountId) as { item_id: string }[];
    return [...STARTER_ITEMS, ...rows.map((r) => r.item_id)];
  }

  /** What each slot shows, defaults filled in: what others see at the table. */
  equipped(accountId: string): Record<Slot, string> {
    const rows = this.db
      .prepare('SELECT slot, item_id FROM equipped WHERE account_id = ?')
      .all(accountId) as { slot: Slot; item_id: string }[];
    const chosen = new Map(rows.map((r) => [r.slot, r.item_id]));
    return Object.fromEntries(
      SLOTS.map((slot) => [slot, chosen.get(slot) ?? defaultFor(slot)]),
    ) as Record<Slot, string>;
  }

  equip(accountId: string, slot: unknown, itemId: unknown) {
    const item = typeof itemId === 'string' ? itemById(itemId) : undefined;
    if (!item || item.kind !== slot)
      throw new ApiError('This item does not go there.', 'INVALID_ITEM');
    if (!this.owns(accountId, item.id))
      throw new ApiError('You do not own this item.', 'NOT_OWNED', 403);
    this.db
      .prepare(
        'INSERT INTO equipped VALUES (?, ?, ?) ON CONFLICT(account_id, slot) DO UPDATE SET item_id = excluded.item_id',
      )
      .run(accountId, slot, item.id);
  }

  view(accountId: string): InventoryView {
    return { owned: this.owned(accountId), equipped: this.equipped(accountId) };
  }
}
