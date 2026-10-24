import type { Tally } from '@cardgame/meta';
import type { ResultSummary } from '@cardgame/protocol';
import type { Db } from '../../core/database';

/** A member's row in `match_results`, as the profile and the export read it. */
export type ResultRow = {
  ref: string;
  room: string;
  kind: string;
  seat: number;
  won: boolean;
  score: number;
  players: number;
  humans: number;
  season: number;
  xp: number;
  coins: number;
  ended: number;
};
export type MissionRow = {
  mission_id: string;
  period: string;
  progress: number;
  claimed: number | null;
};

/**
 * Progression's tables: XP, lifetime counters, per-match results, mission progress per period,
 * unlocked achievements and season XP. Plain reads and writes; `award.ts` decides.
 */
export class ProgressStore {
  constructor(private db: Db) {}

  xp(accountId: string): number {
    const row = this.db
      .prepare('SELECT xp FROM progression WHERE account_id = ?')
      .get(accountId) as { xp: number } | undefined;
    return row?.xp ?? 0;
  }

  addXp(accountId: string, amount: number) {
    this.db
      .prepare(
        `INSERT INTO progression VALUES (?, ?)
         ON CONFLICT(account_id) DO UPDATE SET xp = xp + excluded.xp`,
      )
      .run(accountId, amount);
  }

  seasonXp(accountId: string, season: number): number {
    const row = this.db
      .prepare('SELECT xp FROM season_xp WHERE account_id = ? AND season = ?')
      .get(accountId, season) as { xp: number } | undefined;
    return row?.xp ?? 0;
  }

  addSeasonXp(accountId: string, season: number, amount: number) {
    this.db
      .prepare(
        `INSERT INTO season_xp VALUES (?, ?, ?)
         ON CONFLICT(account_id, season) DO UPDATE SET xp = xp + excluded.xp`,
      )
      .run(accountId, season, amount);
  }

  seasons(accountId: string): { season: number; xp: number }[] {
    return this.db
      .prepare('SELECT season, xp FROM season_xp WHERE account_id = ? ORDER BY season')
      .all(accountId) as { season: number; xp: number }[];
  }

  stats(accountId: string): Tally {
    const rows = this.db
      .prepare('SELECT stat, value FROM progress_stats WHERE account_id = ?')
      .all(accountId) as { stat: string; value: number }[];
    return Object.fromEntries(rows.map((r) => [r.stat, r.value]));
  }

  /** Adds each counter; `max` keys keep the highest value instead of a sum. */
  addStats(accountId: string, tally: Tally, max: readonly string[] = []) {
    const statement = this.db.prepare(
      `INSERT INTO progress_stats VALUES (?, ?, ?)
       ON CONFLICT(account_id, stat) DO UPDATE SET value = CASE WHEN ? THEN max(value, excluded.value)
         ELSE value + excluded.value END`,
    );
    for (const [stat, value] of Object.entries(tally))
      if (value) statement.run(accountId, stat, value, max.includes(stat) ? 1 : 0);
  }

  hasResult(accountId: string, ref: string): boolean {
    return !!this.db
      .prepare('SELECT 1 FROM match_results WHERE account_id = ? AND ref = ?')
      .get(accountId, ref);
  }

  saveResult(accountId: string, row: ResultRow, summary: ResultSummary) {
    this.db
      .prepare(
        `INSERT INTO match_results (account_id, ref, room, kind, seat, won, score, players, humans,
           season, xp, coins, summary, ended) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        accountId,
        ...[row.ref, row.room, row.kind, row.seat, row.won ? 1 : 0, row.score, row.players],
        ...[row.humans, row.season, row.xp, row.coins, JSON.stringify(summary), row.ended],
      );
  }

  /** The member's latest result at a table. */
  lastSummary(accountId: string, room: string): ResultSummary | null {
    const row = this.db
      .prepare(
        'SELECT summary FROM match_results WHERE account_id = ? AND room = ? ORDER BY ended DESC, id DESC LIMIT 1',
      )
      .get(accountId, room) as { summary: string } | undefined;
    return row ? (JSON.parse(row.summary) as ResultSummary) : null;
  }

  results(accountId: string, limit: number): ResultRow[] {
    const rows = this.db
      .prepare(
        `SELECT ref, room, kind, seat, won, score, players, humans, season, xp, coins, ended
         FROM match_results WHERE account_id = ? ORDER BY ended DESC, id DESC LIMIT ?`,
      )
      .all(accountId, limit) as (ResultRow & { won: number })[];
    return rows.map((r) => ({ ...r, won: r.won === 1 }));
  }

  missions(accountId: string, periods: readonly string[]): MissionRow[] {
    if (!periods.length) return [];
    return this.db
      .prepare(
        `SELECT mission_id, period, progress, claimed FROM mission_progress
         WHERE account_id = ? AND period IN (${periods.map(() => '?').join(',')})`,
      )
      .all(accountId, ...periods) as MissionRow[];
  }

  allMissions(accountId: string): MissionRow[] {
    return this.db
      .prepare(
        'SELECT mission_id, period, progress, claimed FROM mission_progress WHERE account_id = ?',
      )
      .all(accountId) as MissionRow[];
  }

  setMission(accountId: string, row: MissionRow) {
    this.db
      .prepare(
        `INSERT INTO mission_progress VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(account_id, mission_id, period) DO UPDATE
           SET progress = excluded.progress, claimed = excluded.claimed`,
      )
      .run(accountId, row.mission_id, row.period, row.progress, row.claimed);
  }

  unlocked(accountId: string): Map<string, number> {
    const rows = this.db
      .prepare('SELECT achievement_id, unlocked FROM achievements WHERE account_id = ?')
      .all(accountId) as { achievement_id: string; unlocked: number }[];
    return new Map(rows.map((r) => [r.achievement_id, r.unlocked]));
  }

  unlock(accountId: string, achievementId: string, at: number) {
    this.db
      .prepare('INSERT OR IGNORE INTO achievements VALUES (?, ?, ?)')
      .run(accountId, achievementId, at);
  }
}

export const PROGRESSION_TABLES = `
  CREATE TABLE progression (account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    xp INTEGER NOT NULL);
  CREATE TABLE season_xp (account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    season INTEGER NOT NULL, xp INTEGER NOT NULL, PRIMARY KEY (account_id, season));
  CREATE TABLE progress_stats (account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    stat TEXT NOT NULL, value INTEGER NOT NULL, PRIMARY KEY (account_id, stat));
  CREATE TABLE match_results (id INTEGER PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, ref TEXT NOT NULL,
    room TEXT NOT NULL, kind TEXT NOT NULL, seat INTEGER NOT NULL, won INTEGER NOT NULL,
    score INTEGER NOT NULL, players INTEGER NOT NULL, humans INTEGER NOT NULL,
    season INTEGER NOT NULL, xp INTEGER NOT NULL, coins INTEGER NOT NULL, summary TEXT NOT NULL,
    ended INTEGER NOT NULL, UNIQUE (account_id, ref));
  CREATE INDEX match_results_recent ON match_results(account_id, ended);
  CREATE INDEX match_results_room ON match_results(account_id, room);
  CREATE TABLE mission_progress (account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    mission_id TEXT NOT NULL, period TEXT NOT NULL, progress INTEGER NOT NULL, claimed INTEGER,
    PRIMARY KEY (account_id, mission_id, period));
  CREATE TABLE achievements (account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL, unlocked INTEGER NOT NULL, PRIMARY KEY (account_id, achievement_id));`;
