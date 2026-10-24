import type { Db } from '../../core/database';
import { ApiError } from '../../core/http/errors';

/** A credit or debit: what for (`reward.match`, `shop.buy`) and an optional idempotency key. */
export type Movement = { amount: number; reason: string; ref?: string };

/**
 * Coins. Every change is a row in `coin_ledger`, and a `ref` (a match id, an order id) can only
 * be used once per account: retrying a reward or a purchase never pays or charges twice.
 * Call inside `db.transaction` together with what the coins pay for.
 */
export class Wallet {
  constructor(
    private db: Db,
    private now: () => number,
  ) {}

  balance(accountId: string): number {
    const row = this.db.prepare('SELECT coins FROM wallets WHERE account_id = ?').get(accountId) as
      { coins: number } | undefined;
    return row?.coins ?? 0;
  }

  /** Adds coins; false when `ref` was already used (nothing changes then). */
  credit(accountId: string, movement: Movement): boolean {
    if (!Number.isSafeInteger(movement.amount) || movement.amount <= 0)
      throw new Error('Credit a positive whole amount.');
    return this.move(accountId, movement.amount, movement);
  }

  /** Takes coins, refusing with INSUFFICIENT_COINS when the balance is too low. */
  debit(accountId: string, movement: Movement): boolean {
    if (!Number.isSafeInteger(movement.amount) || movement.amount <= 0)
      throw new Error('Debit a positive whole amount.');
    if (this.balance(accountId) < movement.amount)
      throw new ApiError('Not enough coins.', 'INSUFFICIENT_COINS', 400, {
        needed: movement.amount,
      });
    return this.move(accountId, -movement.amount, movement);
  }

  history(accountId: string, limit = 50) {
    return this.db
      .prepare(
        'SELECT delta, reason, ref, created FROM coin_ledger WHERE account_id = ? ORDER BY id DESC LIMIT ?',
      )
      .all(accountId, limit) as {
      delta: number;
      reason: string;
      ref: string | null;
      created: number;
    }[];
  }

  private move(accountId: string, delta: number, movement: Movement): boolean {
    return this.db.transaction(() => {
      const inserted = this.db
        .prepare(
          'INSERT OR IGNORE INTO coin_ledger (account_id, delta, reason, ref, created) VALUES (?, ?, ?, ?, ?)',
        )
        .run(accountId, delta, movement.reason, movement.ref ?? null, this.now());
      if (!inserted.changes) return false;
      // Two steps: SQLite checks `coins >= 0` on an upsert's proposed row, even when it conflicts.
      this.db.prepare('INSERT OR IGNORE INTO wallets VALUES (?, 0)').run(accountId);
      this.db
        .prepare('UPDATE wallets SET coins = coins + ? WHERE account_id = ?')
        .run(delta, accountId);
      return true;
    })();
  }
}
