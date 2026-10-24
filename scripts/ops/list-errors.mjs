#!/usr/bin/env node
// Server errors recorded in error_log (unexpected 500s and crashes), most recent first. Read-only.
//   DB_PATH=data/game.sqlite node scripts/ops/list-errors.mjs [hours=24] [--stack]
import { HOUR_MS, hasTable, openReadOnly, wholeNumber } from './database.mjs';

const DEFAULT_HOURS = 24;
const MAX_HOURS = 24 * 90;

const args = process.argv.slice(2);
const withStack = args.includes('--stack');
const hours = wholeNumber(
  args.find((arg) => !arg.startsWith('--')),
  {
    fallback: DEFAULT_HOURS,
    max: MAX_HOURS,
    usage: `Usage: node scripts/ops/list-errors.mjs [hours, 1 to ${MAX_HOURS}] [--stack]`,
  },
);

const when = (time) => new Date(time).toISOString().replace('T', ' ').slice(0, 16);

function print(row) {
  console.log(
    `${when(row.last_at)} UTC · ${row.source} ×${row.count} · ${row.route} · ${row.stack_hash}` +
      ` · since ${when(row.first_at)} · last request ${row.request_id ?? '-'}\n    ${row.message}`,
  );
  if (withStack && row.stack) console.log(`      ${row.stack.split('\n').join('\n      ')}`);
}

const { path, db } = openReadOnly();
try {
  const rows = hasTable(db, 'error_log')
    ? db
        .prepare('SELECT * FROM error_log WHERE last_at >= ? ORDER BY last_at DESC')
        .all(Date.now() - hours * HOUR_MS)
    : [];
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  console.log(`${rows.length} distinct errors, ${total} occurrences, last ${hours} h (${path})`);
  rows.forEach(print);
} finally {
  db.close();
}
