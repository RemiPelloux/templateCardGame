// Opens the server's SQLite file read-only for the ops scripts. better-sqlite3 is a dependency
// of the server package, so it is loaded from there.
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(resolve(import.meta.dirname, '../../apps/server/package.json'));
const Database = require('better-sqlite3');

/** The database at DB_PATH (default data/game.sqlite, from the current directory). */
export function openReadOnly() {
  const path = resolve(process.env.DB_PATH ?? 'data/game.sqlite');
  return { path, db: new Database(path, { readonly: true, fileMustExist: true }) };
}

/** True when `table` exists: a database from before the telemetry feature has neither table. */
export const hasTable = (db, table) =>
  Boolean(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table));

export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;

/** A positive whole number from the command line, or `fallback`; exits with `usage` otherwise. */
export function wholeNumber(value, { fallback, max, usage }) {
  const number = Number(value ?? fallback);
  if (Number.isInteger(number) && number >= 1 && number <= max) return number;
  console.error(usage);
  process.exit(1);
}
