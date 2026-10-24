import { useQuery } from '@tanstack/react-query';
import { rankedApi, type RankedView } from '@cardgame/protocol';
import { http } from '../../net/http';

export const rankedKey = ['ranked'] as const;

/** Polling while searching keeps the queue entry alive and notices the match quickly. */
const SEARCH_POLL_MS = 2000;

/** My rating, queue status, leaderboard and recent games, shared by the screen and panels. */
export function useRanked(enabled = true) {
  return useQuery({
    queryKey: rankedKey,
    queryFn: () => http.get<RankedView>(rankedApi.ranked),
    enabled,
    refetchInterval: (query) =>
      query.state.data?.queue.state === 'searching' ? SEARCH_POLL_MS : false,
  });
}
