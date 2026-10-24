/** One line of the leaderboard. `handle` is `name#tag`, for profile links. */
export type RankedRow = {
  rank: number;
  name: string;
  handle: string;
  rating: number;
  games: number;
  provisional: boolean;
};

/** Searching widens the accepted rating gap with time; `matched` names the table to join. */
export type RankedQueueStatus =
  | { state: 'idle' }
  | { state: 'searching'; since: number; gap: number }
  | { state: 'matched'; room: string };

export type RankedResult = 'win' | 'loss' | 'draw';

/** A rated game from the member's side: the rating after it and the change it made. */
export type RankedGame = {
  room: string;
  opponent: string;
  result: RankedResult;
  delta: number;
  rating: number;
  ended: number;
};

export type RankedView = {
  rating: number;
  provisional: boolean;
  games: number;
  wins: number;
  queue: RankedQueueStatus;
  leaderboard: { top: RankedRow[]; me: RankedRow | null };
  recent: RankedGame[];
};

export const rankedApi = {
  ranked: '/api/ranked',
  /** POST joins the queue, DELETE leaves it; both answer the RankedQueueStatus. */
  queue: '/api/ranked/queue',
} as const;
