/** One line of a daily ranking. `handle` is `name#tag`, for profile links. */
export type DailyRankRow = {
  rank: number;
  name: string;
  handle: string;
  won: boolean;
  score: number;
  moves: number;
};

/** A finished daily challenge: the member's own line, and the room it was played in. */
export type DailyResult = DailyRankRow & { room: string; reward: number };

/**
 * Where the member stands today. `abandoned`: they left the table before the end, which uses
 * the day's single attempt without a result.
 */
export type DailyStatus =
  | { state: 'new' }
  | { state: 'playing'; room: string }
  | { state: 'abandoned' }
  | { state: 'finished'; result: DailyResult };

export type DailyView = {
  /** Today in the challenge's time zone, `YYYY-MM-DD`. */
  day: string;
  /** When the next challenge opens (epoch ms). */
  nextAt: number;
  status: DailyStatus;
  /** Consecutive days finished, up to today (or yesterday while today is not played yet). */
  streak: { current: number; best: number };
  ranking: { players: number; top: DailyRankRow[]; me: DailyRankRow | null };
  /** Yesterday's top three. */
  podium: { day: string; top: DailyRankRow[] };
};

export type DailyStartResponse = { room: string };

export const dailyApi = {
  daily: '/api/daily',
  start: '/api/daily/start',
} as const;
