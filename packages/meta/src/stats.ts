/**
 * Counters a finished match adds to one player's statistics, as a flat record of named
 * numbers. Missions and achievements name the counter they follow, so a new one is data only.
 *
 * - `matches`, `wins`, and per kind `matches.casual`, `wins.ranked`…
 * - `log.<event>` for each log entry of the player's seat (`log.play`: cards played), and
 *   `log.<event>.<rank>` when the entry carries a card (`log.play.8`: eights played).
 */
export type Tally = Record<string, number>;

/** Not a sum: the server keeps the highest level reached under this key. */
export const LEVEL_STAT = 'level';

/** The part of an engine log entry the tally reads (kept structural: meta needs no engine). */
export type LogLine = { seat: number | null; event: string; data?: Record<string, unknown> };

export type SeatResult = {
  kind: string;
  won: boolean;
  seat: number;
  /** The match's log, as the engine keeps it. */
  log: readonly LogLine[];
};

const add = (tally: Tally, key: string, amount = 1) => {
  tally[key] = (tally[key] ?? 0) + amount;
};

const rankOf = (data: LogLine['data']) => {
  const card = data?.card as { rank?: unknown } | undefined;
  return typeof card?.rank === 'string' ? card.rank : null;
};

/** What one seat's match adds to its statistics. */
export function tallyMatch(result: SeatResult): Tally {
  const tally: Tally = {};
  add(tally, 'matches');
  add(tally, `matches.${result.kind}`);
  add(tally, 'wins', result.won ? 1 : 0);
  add(tally, `wins.${result.kind}`, result.won ? 1 : 0);
  for (const entry of result.log) {
    if (entry.seat !== result.seat) continue;
    add(tally, `log.${entry.event}`);
    const rank = rankOf(entry.data);
    if (rank) add(tally, `log.${entry.event}.${rank}`);
  }
  return tally;
}

/** Sums two tallies into a new one. */
export function addTallies(a: Tally, b: Tally): Tally {
  const sum = { ...a };
  for (const [key, value] of Object.entries(b)) add(sum, key, value);
  return sum;
}
