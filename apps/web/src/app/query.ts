import { QueryClient } from '@tanstack/react-query';
import { RequestError } from '../net/http';

const STALE_MS = 30_000;
const MAX_RETRIES = 2;

/**
 * One cache for every piece of server state (session, wallet, friends…): screens reading the
 * same key share one request, and a mutation writes its answer into the cache for all of them.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_MS,
      // A refusal (4xx) will not change on retry; a network blip might.
      retry: (count, error) =>
        count < MAX_RETRIES &&
        !(error instanceof RequestError && error.status >= 400 && error.status < 500),
    },
  },
});

/** Cache keys, in one place so features invalidate each other's data by name. */
export const keys = {
  session: ['session'] as const,
  account: ['account'] as const,
  wallet: ['wallet'] as const,
  inventory: ['inventory'] as const,
};
