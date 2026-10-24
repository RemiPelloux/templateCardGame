import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BUSY_TIMEOUT_MS = 5000;

export type Db = Database.Database;

/**
 * One step of a feature's schema. Ids are permanent (`accounts.1-tables`): a migration runs
 * once, is recorded in `migrations`, and is never edited after it ships. Append new ones.
 */
export type Migration = { id: string; up: string | ((db: Db) => void) };

/** Opens (or creates) the database: WAL for concurrent reads, foreign keys enforced. */
export function openDatabase(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
  return db;
}

/** Applies, in order and each in its own transaction, every migration not applied yet. */
export function migrate(db: Db, migrations: readonly Migration[], now = Date.now) {
  db.exec('CREATE TABLE IF NOT EXISTS migrations (id TEXT PRIMARY KEY, applied INTEGER NOT NULL)');
  const applied = new Set(
    (db.prepare('SELECT id FROM migrations').all() as { id: string }[]).map((r) => r.id),
  );
  const ids = new Set<string>();
  for (const migration of migrations) {
    if (ids.has(migration.id)) throw new Error(`Duplicate migration id ${migration.id}`);
    ids.add(migration.id);
    if (applied.has(migration.id)) continue;
    db.transaction(() => {
      if (typeof migration.up === 'string') db.exec(migration.up);
      else migration.up(db);
      db.prepare('INSERT INTO migrations VALUES (?, ?)').run(migration.id, now());
    })();
  }
}
