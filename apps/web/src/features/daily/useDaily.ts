import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { dailyApi, type DailyRankRow, type DailyView } from '@cardgame/protocol';
import { http } from '../../net/http';

export const dailyKey = ['daily'] as const;

const SECOND_MS = 1000;
const MINUTE_S = 60;
const HOUR_S = 60 * MINUTE_S;
const TWO_DIGITS = 2;

/** Today's challenge, my status, the rankings: one request, shared by the screen and panels. */
export function useDaily(enabled = true) {
  return useQuery({
    queryKey: dailyKey,
    queryFn: () => http.get<DailyView>(dailyApi.daily),
    enabled,
  });
}

/** `hh:mm:ss` until `until`, ticking every second; calls `onDone` once it is reached. */
export function useCountdown(until: number | undefined, onDone: () => void) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), SECOND_MS);
    return () => clearInterval(timer);
  }, []);
  const left = until === undefined ? 0 : Math.max(0, Math.ceil((until - now) / SECOND_MS));
  const done = until !== undefined && left === 0;
  useEffect(() => {
    if (done) onDone();
  }, [done, onDone]);
  const pad = (n: number) => String(n).padStart(TWO_DIGITS, '0');
  const hours = Math.floor(left / HOUR_S);
  const minutes = Math.floor((left % HOUR_S) / MINUTE_S);
  return `${pad(hours)}:${pad(minutes)}:${pad(left % MINUTE_S)}`;
}

/** The placeholders of `daily.result.line`. */
export const lineParams = (row: DailyRankRow, players: number) => ({
  rank: row.rank,
  players,
  score: row.score,
  moves: row.moves,
});
