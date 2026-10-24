#!/usr/bin/env node
// Field report from the telemetry table: p50/p75/p95 of each Web Vital by device, the slowest
// API routes by p75, and the most frequent script errors. Read-only.
//   DB_PATH=data/game.sqlite node scripts/ops/telemetry-report.mjs [days=7]
import { DAY_MS, hasTable, openReadOnly, wholeNumber } from './database.mjs';

const DEFAULT_DAYS = 7;
const MAX_DAYS = 90;
const TOP_ROUTES = 15;
const TOP_ERRORS = 10;
/** Google's "good" thresholds at p75: https://web.dev/articles/vitals */
const TARGETS = { LCP: 2500, INP: 200, CLS: 0.1, FCP: 1800, TTFB: 800 };
const QUANTILES = { p50: 0.5, p75: 0.75, p95: 0.95 };
const SMALL = 10;
const PRECISION = 1000;

const days = wholeNumber(process.argv[2], {
  fallback: DEFAULT_DAYS,
  max: MAX_DAYS,
  usage: `Usage: node scripts/ops/telemetry-report.mjs [days, 1 to ${MAX_DAYS}]`,
});

const quantile = (sorted, q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
const round = (value) =>
  value < SMALL ? Math.round(value * PRECISION) / PRECISION : Math.round(value);

/** Percentiles of each group of rows (already sorted by value), keyed by `keyOf`. */
function percentiles(rows, keyOf) {
  const groups = Map.groupBy(rows, keyOf);
  return [...groups].map(([key, list]) => {
    const values = list.map((row) => row.value);
    const stats = Object.fromEntries(
      Object.entries(QUANTILES).map(([label, q]) => [label, round(quantile(values, q))]),
    );
    return { key, samples: values.length, ...stats };
  });
}

function vitals(db, since) {
  const rows = db
    .prepare(
      "SELECT name, device, value FROM telemetry WHERE kind = 'vital' AND at >= ? ORDER BY value",
    )
    .all(since);
  return percentiles(rows, (row) => `${row.name} ${row.device}`)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(({ key, ...stats }) => {
      const target = TARGETS[key.split(' ')[0]];
      const verdict = target === undefined ? '' : stats.p75 <= target ? 'good' : `> ${target}`;
      return { metric: key, ...stats, target: verdict };
    });
}

function routes(db, since) {
  const rows = db
    .prepare("SELECT name, value FROM telemetry WHERE kind = 'api' AND at >= ? ORDER BY value")
    .all(since);
  return percentiles(rows, (row) => row.name)
    .sort((a, b) => b.p75 - a.p75)
    .slice(0, TOP_ROUTES)
    .map(({ key, ...stats }) => ({ route: key, ...stats }));
}

const errors = (db, since) =>
  db
    .prepare(
      `SELECT name, detail, COUNT(*) AS count FROM telemetry WHERE kind = 'error' AND at >= ?
       GROUP BY name, detail ORDER BY count DESC LIMIT ?`,
    )
    .all(since, TOP_ERRORS);

const { path, db } = openReadOnly();
try {
  if (!hasTable(db, 'telemetry')) throw new Error(`No telemetry table in ${path}.`);
  const since = Date.now() - days * DAY_MS;
  console.log(`Field report, last ${days} days (${path})\n\nWeb Vitals (ms; CLS unitless)`);
  console.table(vitals(db, since));
  console.log(`\nSlowest API routes by p75 (ms)`);
  console.table(routes(db, since));
  console.log('\nMost frequent script errors');
  console.table(errors(db, since));
} finally {
  db.close();
}
