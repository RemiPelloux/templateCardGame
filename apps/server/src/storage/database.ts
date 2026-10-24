import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BUSY_TIMEOUT_MS = 5000;

/**
 * Additive migrations, applied in order and recorded in `schema_version`. Never edit a shipped
 * one: append a new step. Each step runs in a transaction.
 */
const MIGRATIONS: string[] = [
  `CREATE TABLE sessions (hash TEXT PRIMARY KEY, player_id TEXT NOT NULL, name TEXT NOT NULL,
     created INTEGER NOT NULL, seen INTEGER NOT NULL);
   CREATE INDEX sessions_seen ON sessions(seen);
   CREATE TABLE rooms (code TEXT PRIMARY KEY, data TEXT NOT NULL, touched INTEGER NOT NULL);
   CREATE TABLE matches (id INTEGER PRIMARY KEY, game TEXT NOT NULL, rules_version INTEGER NOT NULL,
     room TEXT NOT NULL, data TEXT NOT NULL, ended INTEGER NOT NULL);`,
];

export type Db = Database.Database;

/** Opens (or creates) the database: WAL for concurrent reads, schema migrated to the latest step. */
export function openDatabase(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
  migrate(db);
  return db;
}

function migrate(db: Db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const row = db.prepare('SELECT version FROM schema_version').get() as
    { version: number } | undefined;
  const current = row?.version ?? 0;
  if (!row) db.prepare('INSERT INTO schema_version VALUES (0)').run();
  MIGRATIONS.slice(current).forEach((sql, i) =>
    db.transaction(() => {
      db.exec(sql);
      db.prepare('UPDATE schema_version SET version = ?').run(current + i + 1);
    })(),
  );
}
