import type { DailyRankRow } from '@cardgame/protocol';
import type { Db } from '../../core/database';

type Row = {
  account_id: string;
  name: string;
  tag: number;
  won: number;
  score: number;
  moves: number;
  rank: number;
};

/**
 * The day's finished attempts in ranking order: winners first, then the higher score, then the
 * fewer moves, then whoever finished first. ROW_NUMBER, not RANK: every line has its own place.
 */
const RANKED = `SELECT r.account_id, a.username AS name, a.tag, r.won, r.score, r.moves,
    ROW_NUMBER() OVER (ORDER BY r.won DESC, r.score DESC, r.moves ASC, r.finished ASC) AS rank
  FROM daily_results r JOIN accounts a ON a.id = r.account_id
  WHERE r.day = ? AND r.finished IS NOT NULL`;

const toRow = (row: Row): DailyRankRow => ({
  rank: row.rank,
  name: row.name,
  handle: `${row.name}#${row.tag}`,
  won: row.won === 1,
  score: row.score,
  moves: row.moves,
});

/** The first `limit` lines of a day's ranking. */
export function topOf(db: Db, day: string, limit: number): DailyRankRow[] {
  const rows = db.prepare(`${RANKED} ORDER BY rank LIMIT ?`).all(day, limit) as Row[];
  return rows.map(toRow);
}

/** A member's line in a day's ranking, or null when they have not finished that day. */
export function lineOf(db: Db, day: string, accountId: string): DailyRankRow | null {
  const row = db.prepare(`SELECT * FROM (${RANKED}) WHERE account_id = ?`).get(day, accountId) as
    Row | undefined;
  return row ? toRow(row) : null;
}

export function finishersOf(db: Db, day: string): number {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM daily_results WHERE day = ? AND finished IS NOT NULL')
    .get(day) as { n: number };
  return row.n;
}
