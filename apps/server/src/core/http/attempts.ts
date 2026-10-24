import type { Db } from '../database';
import { ApiError } from './errors';

const TOO_MANY = 429;

/**
 * Persistent counters for sensitive actions (logins, recoveries): unlike the in-memory limiter
 * they survive restarts and count across every address that targets one account.
 */
export class Attempts {
  constructor(
    private db: Db,
    private now = Date.now,
  ) {}

  /** How many attempts `key` made in its current window. */
  count(key: string): number {
    this.db.prepare('DELETE FROM attempts WHERE until < ?').run(this.now());
    const row = this.db.prepare('SELECT count FROM attempts WHERE key = ?').get(key) as
      { count: number } | undefined;
    return row?.count ?? 0;
  }

  /** Counts one attempt, refusing once `maximum` is reached within `windowMs`. */
  take(key: string, maximum: number, windowMs: number) {
    if (this.count(key) >= maximum)
      throw new ApiError('Too many attempts. Try again later.', 'TOO_MANY_ATTEMPTS', TOO_MANY);
    this.db
      .prepare(
        'INSERT INTO attempts VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1',
      )
      .run(key, this.now() + windowMs);
  }

  clear(key: string) {
    this.db.prepare('DELETE FROM attempts WHERE key = ?').run(key);
  }
}

export const attemptsMigration = {
  id: 'core.1-attempts',
  up: 'CREATE TABLE attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, until INTEGER NOT NULL)',
};
