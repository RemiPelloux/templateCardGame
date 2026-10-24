import type { Db } from '../../core/database';

type Pair = { a: string; b: string };
type IdRow = { id: string; at: number };

/**
 * The social tables, as plain reads and writes with no rules: friendships (one row per
 * direction), pending requests and blocks. The rules live in `friends.ts` and `blocks.ts`.
 */
export class SocialStore {
  constructor(private db: Db) {}

  private count(sql: string, id: string) {
    return (this.db.prepare(sql).get(id) as { n: number }).n;
  }

  private exists(sql: string, pair: Pair) {
    return this.db.prepare(sql).get(pair.a, pair.b) !== undefined;
  }

  areFriends(pair: Pair) {
    return this.exists('SELECT 1 FROM friendships WHERE account_id = ? AND friend_id = ?', pair);
  }

  /** Whether `a` asked `b` to be friends and `b` has not answered yet. */
  hasRequest(pair: Pair) {
    return this.exists('SELECT 1 FROM friend_requests WHERE from_id = ? AND to_id = ?', pair);
  }

  /** Whether `a` blocked `b`. */
  hasBlocked(pair: Pair) {
    return this.exists('SELECT 1 FROM blocks WHERE blocker_id = ? AND blocked_id = ?', pair);
  }

  /** A block in either direction: no requests, invites or presence between the two. */
  blockedBetween(pair: Pair) {
    return this.hasBlocked(pair) || this.hasBlocked({ a: pair.b, b: pair.a });
  }

  friendCount(id: string) {
    return this.count('SELECT COUNT(*) AS n FROM friendships WHERE account_id = ?', id);
  }

  outgoingCount(id: string) {
    return this.count('SELECT COUNT(*) AS n FROM friend_requests WHERE from_id = ?', id);
  }

  incomingCount(id: string) {
    return this.count('SELECT COUNT(*) AS n FROM friend_requests WHERE to_id = ?', id);
  }

  blockCount(id: string) {
    return this.count('SELECT COUNT(*) AS n FROM blocks WHERE blocker_id = ?', id);
  }

  friends(id: string): IdRow[] {
    return this.db
      .prepare('SELECT friend_id AS id, since AS at FROM friendships WHERE account_id = ?')
      .all(id) as IdRow[];
  }

  incoming(id: string): IdRow[] {
    return this.db
      .prepare('SELECT from_id AS id, created AS at FROM friend_requests WHERE to_id = ?')
      .all(id) as IdRow[];
  }

  outgoing(id: string): IdRow[] {
    return this.db
      .prepare('SELECT to_id AS id, created AS at FROM friend_requests WHERE from_id = ?')
      .all(id) as IdRow[];
  }

  blocked(id: string): IdRow[] {
    return this.db
      .prepare('SELECT blocked_id AS id, created AS at FROM blocks WHERE blocker_id = ?')
      .all(id) as IdRow[];
  }

  request(pair: Pair, now: number) {
    this.db
      .prepare('INSERT OR IGNORE INTO friend_requests VALUES (?, ?, ?)')
      .run(pair.a, pair.b, now);
  }

  /** Forgets pending requests between the two, in both directions. */
  dropRequests(pair: Pair) {
    this.db
      .prepare(
        'DELETE FROM friend_requests WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)',
      )
      .run(pair.a, pair.b, pair.b, pair.a);
  }

  /** Makes the two friends and clears whatever requests led there. */
  befriend(pair: Pair, now: number) {
    const insert = this.db.prepare('INSERT OR IGNORE INTO friendships VALUES (?, ?, ?)');
    insert.run(pair.a, pair.b, now);
    insert.run(pair.b, pair.a, now);
    this.dropRequests(pair);
  }

  unfriend(pair: Pair) {
    this.db
      .prepare(
        `DELETE FROM friendships WHERE (account_id = ? AND friend_id = ?)
           OR (account_id = ? AND friend_id = ?)`,
      )
      .run(pair.a, pair.b, pair.b, pair.a);
  }

  /** Withdraws table invites between the two, in both directions. */
  dropInvites(pair: Pair) {
    this.db
      .prepare(
        'DELETE FROM table_invites WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)',
      )
      .run(pair.a, pair.b, pair.b, pair.a);
  }

  block(pair: Pair, now: number) {
    this.db.prepare('INSERT OR IGNORE INTO blocks VALUES (?, ?, ?)').run(pair.a, pair.b, now);
  }

  unblock(pair: Pair) {
    this.db
      .prepare('DELETE FROM blocks WHERE blocker_id = ? AND blocked_id = ?')
      .run(pair.a, pair.b);
  }
}
