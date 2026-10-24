import type { Db } from '../../core/database';

/** What an order bought: an item outright, or a booster opening. */
export type OrderKind = 'item' | 'booster';

export type Order = {
  request: string;
  kind: OrderKind;
  product: string;
  price: number;
  /** JSON of what the order gave: `{ items }` for an item, the `Opening` for a booster. */
  result: string;
  created: number;
};

/** The `shop_orders` table: one row per purchase, keyed by the member's idempotency key. */
export const ordersMigration = {
  id: 'shop.1-orders',
  up: `CREATE TABLE shop_orders (id INTEGER PRIMARY KEY,
         account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
         request TEXT NOT NULL, kind TEXT NOT NULL, product TEXT NOT NULL,
         price INTEGER NOT NULL, result TEXT NOT NULL, created INTEGER NOT NULL,
         UNIQUE (account_id, request));`,
};

/** Reads and appends the purchase log; callers wrap writes in the transaction that pays. */
export class Orders {
  constructor(private db: Db) {}

  find(accountId: string, request: string): Order | undefined {
    return this.db
      .prepare(
        'SELECT request, kind, product, price, result, created FROM shop_orders WHERE account_id = ? AND request = ?',
      )
      .get(accountId, request) as Order | undefined;
  }

  add(accountId: string, order: Order) {
    this.db
      .prepare(
        'INSERT INTO shop_orders (account_id, request, kind, product, price, result, created) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        accountId,
        order.request,
        order.kind,
        order.product,
        order.price,
        order.result,
        order.created,
      );
  }

  /** Every order of a member, oldest first (the account export). */
  list(accountId: string): Order[] {
    return this.db
      .prepare(
        'SELECT request, kind, product, price, result, created FROM shop_orders WHERE account_id = ? ORDER BY id',
      )
      .all(accountId) as Order[];
  }
}
