import type { TelemetryEvent } from '@cardgame/protocol';
import type { Db } from '../../core/database';

export const DAY_MS = 86_400_000;
/** Samples older than this are deleted: enough for a monthly read, too short to profile anyone. */
export const TELEMETRY_RETENTION_MS = 30 * DAY_MS;
/** Rows written per UTC day, every sender together; later events that day are dropped. */
export const DAILY_ROW_CAP = 20_000;
/** Rows the table may hold (a few tens of MB at the longest details); the oldest go first. */
export const MAX_TELEMETRY_ROWS = 200_000;

export const telemetryMigration = {
  id: 'telemetry.1-tables',
  up: `
    CREATE TABLE telemetry (id INTEGER PRIMARY KEY, at INTEGER NOT NULL, kind TEXT NOT NULL,
      name TEXT NOT NULL, value REAL NOT NULL, screen TEXT NOT NULL, device TEXT NOT NULL,
      detail TEXT);
    CREATE INDEX telemetry_metric ON telemetry(kind, name, at);
    CREATE INDEX telemetry_at ON telemetry(at);
  `,
};

/**
 * Field measurements from players' browsers. Stateless on purpose: the caps are read from the
 * table itself, so restarts and several API instances in one process agree.
 */
export class TelemetryStore {
  constructor(
    private readonly db: Db,
    private readonly now: () => number,
  ) {}

  /** Stores what today's cap still allows and returns how many events were kept. */
  record(events: readonly TelemetryEvent[]): number {
    const at = this.now();
    const kept = events.slice(0, this.roomLeft(at));
    if (!kept.length) return 0;
    const insert = this.db.prepare(
      'INSERT INTO telemetry (at, kind, name, value, screen, device, detail) VALUES (?, ?, ?, ?, ?, ?, ?)',
    );
    this.db.transaction(() => {
      for (const e of kept)
        insert.run(at, e.kind, e.name, e.value, e.screen, e.device, e.detail ?? null);
      // Ids only grow, so this keeps at most MAX_TELEMETRY_ROWS rows, dropping the oldest.
      this.db
        .prepare('DELETE FROM telemetry WHERE id <= (SELECT MAX(id) FROM telemetry) - ?')
        .run(MAX_TELEMETRY_ROWS);
    })();
    return kept.length;
  }

  /** Deletes samples past retention. */
  sweep() {
    this.db.prepare('DELETE FROM telemetry WHERE at < ?').run(this.now() - TELEMETRY_RETENTION_MS);
  }

  private roomLeft(at: number) {
    const dayStart = Math.floor(at / DAY_MS) * DAY_MS;
    const row = this.db.prepare('SELECT COUNT(*) AS n FROM telemetry WHERE at >= ?').get(dayStart);
    return Math.max(0, DAILY_ROW_CAP - (row as { n: number }).n);
  }
}
