import { ApiError } from './errors';

const WINDOW_MS = 60_000;
/** A cap on tracked keys, so a flood of addresses cannot grow memory without bound. */
const MAX_BUCKETS = 10_000;
const TOO_MANY = 429;

/** Fixed-window limiter: `limit(key, perMinute)` throws once a key goes over its budget. */
export function createLimiter(now = Date.now) {
  const buckets = new Map<string, { count: number; until: number }>();
  let sweepAt = 0;
  return (key: string, perMinute: number) => {
    const time = now();
    if (time >= sweepAt) {
      for (const [id, bucket] of buckets) if (bucket.until <= time) buckets.delete(id);
      sweepAt = time + WINDOW_MS;
    }
    let bucket = buckets.get(key);
    if (!bucket || bucket.until <= time) {
      if (buckets.size >= MAX_BUCKETS)
        throw new ApiError('Server busy, try again.', 'BUSY', TOO_MANY);
      bucket = { count: 0, until: time + WINDOW_MS };
      buckets.set(key, bucket);
    }
    if (++bucket.count > perMinute)
      throw new ApiError('Too many requests, try again in a minute.', 'RATE_LIMITED', TOO_MANY);
  };
}

export type Limiter = ReturnType<typeof createLimiter>;
