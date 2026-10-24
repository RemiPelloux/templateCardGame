import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  profileApi,
  progressionApi,
  type ClaimResponse,
  type ProfileView,
  type ProgressionView,
  type ResultSummary,
} from '@cardgame/protocol';
import { keys } from '../../app/query';
import { http } from '../../net/http';

type TableAt = { room: string; revision: number };

/** Cache keys of progression and profiles; a reward invalidates all of them and the wallet. */
export const progressionKeys = {
  all: ['progression'] as const,
  /** Keyed by revision too: a rematch at the same table is a new result. */
  result: (at: TableAt) => ['progression', 'result', at.room, at.revision] as const,
  profiles: ['profile'] as const,
  profile: (handle: string | undefined) => ['profile', handle ?? null] as const,
};

/** Rewards changed: refresh everything that shows XP, missions or coins. */
export function useRewardsChanged() {
  const client = useQueryClient();
  return useCallback(() => {
    void client.invalidateQueries({ queryKey: keys.wallet });
    void client.invalidateQueries({ queryKey: keys.inventory });
    void client.invalidateQueries({ queryKey: progressionKeys.profiles });
    void client.invalidateQueries({ queryKey: progressionKeys.all, exact: true });
  }, [client]);
}

export const useProgression = (enabled = true) =>
  useQuery({
    queryKey: progressionKeys.all,
    queryFn: () => http.get<ProgressionView>(progressionApi.progression),
    enabled,
  });

export const useResult = (at: TableAt, enabled: boolean) =>
  useQuery({
    queryKey: progressionKeys.result(at),
    queryFn: () => http.get<ResultSummary>(progressionApi.result(at.room)),
    enabled,
  });

export const useProfile = (handle: string | undefined) =>
  useQuery({
    queryKey: progressionKeys.profile(handle),
    queryFn: () => http.get<ProfileView>(handle ? profileApi.of(handle) : profileApi.mine),
  });

/** Claims a completed mission; the answer is the new progression, written into the cache. */
export function useClaim() {
  const client = useQueryClient();
  const changed = useRewardsChanged();
  return useMutation({
    mutationFn: (id: string) => http.post<ClaimResponse>(progressionApi.claim(id)),
    onSuccess: (response) => {
      changed();
      client.setQueryData(progressionKeys.all, response.progression);
    },
  });
}
