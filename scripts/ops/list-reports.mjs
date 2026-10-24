#!/usr/bin/env node
/**
 * Prints recent member reports for moderation, newest first, read-only.
 *
 *   DB_PATH=data/game.sqlite node scripts/ops/list-reports.mjs [--days 7] [--limit 100]
 *
 * A side whose account was deleted shows as "(deleted)": the report is kept, the person is not.
 * See docs/social.md for the moderation workflow.
 */
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';

const DAY_MS = 86_400_000;
const DEFAULTS = { days: '7', limit: '100' };

// better-sqlite3 is the server's dependency: resolve it from there rather than the root.
const require = createRequire(new URL('../../apps/server/package.json', import.meta.url));
const Database = require('better-sqlite3');

const { values } = parseArgs({
  options: {
    days: { type: 'string', default: DEFAULTS.days },
    limit: { type: 'string', default: DEFAULTS.limit },
  },
});
const path = process.env.DB_PATH;
if (!path) {
  console.error('Set DB_PATH to the SQLite file, e.g. DB_PATH=data/game.sqlite');
  process.exit(1);
}

const db = new Database(path, { readonly: true, fileMustExist: true });
const handle = (alias) => `COALESCE(${alias}.username || '#' || ${alias}.tag, '(deleted)')`;
const rows = db
  .prepare(
    `SELECT r.id, r.created, ${handle('reporter')} AS reporter, ${handle('target')} AS target,
            r.reason, r.room, r.note
       FROM reports r
       LEFT JOIN accounts reporter ON reporter.id = r.reporter_id
       LEFT JOIN accounts target ON target.id = r.target_id
      WHERE r.created > ?
      ORDER BY r.created DESC
      LIMIT ?`,
  )
  .all(Date.now() - Number(values.days) * DAY_MS, Number(values.limit));
db.close();

if (rows.length === 0) console.log(`No reports in the last ${values.days} days.`);
else
  console.table(
    rows.map((row) => ({
      ...row,
      created: new Date(row.created).toISOString(),
      note: row.note ?? '',
    })),
  );
