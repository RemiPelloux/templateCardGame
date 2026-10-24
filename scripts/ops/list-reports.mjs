#!/usr/bin/env node
/**
 * Prints recent member reports for moderation, newest first, read-only.
 *
 *   node scripts/ops/list-reports.mjs [--days 7] [--limit 100]   (DB_PATH to read another file)
 *
 * A side whose account was deleted shows as "(deleted)": the report is kept, the person is not.
 * See docs/social.md for the moderation workflow.
 */
import { parseArgs } from 'node:util';
import { DAY_MS, openReadOnly, wholeNumber } from './database.mjs';

const DEFAULTS = { days: '7', limit: '100' };
const MAX_DAYS = 365;
const MAX_LIMIT = 10_000;
const USAGE = 'Usage: node scripts/ops/list-reports.mjs [--days 1..365] [--limit 1..10000]';

const { values } = parseArgs({
  options: {
    days: { type: 'string', default: DEFAULTS.days },
    limit: { type: 'string', default: DEFAULTS.limit },
  },
});
const days = wholeNumber(values.days, { fallback: DEFAULTS.days, max: MAX_DAYS, usage: USAGE });
const limit = wholeNumber(values.limit, { fallback: DEFAULTS.limit, max: MAX_LIMIT, usage: USAGE });
const { db } = openReadOnly();
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
  .all(Date.now() - days * DAY_MS, limit);
db.close();

if (rows.length === 0) console.log(`No reports in the last ${days} days.`);
else
  console.table(
    rows.map((row) => ({
      ...row,
      created: new Date(row.created).toISOString(),
      note: row.note ?? '',
    })),
  );
