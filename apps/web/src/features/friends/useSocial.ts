import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  roomApi,
  socialApi,
  type RoomKind,
  type SocialOverview,
  type SocialPulse,
} from '@cardgame/protocol';
import { http } from '../../net/http';
import { useSession } from '../account/useSession';

/** Friends' presence changes slowly: a modest poll is enough, no live channel needed. */
export const OVERVIEW_POLL_MS = 30_000;
/** The presence ping; the server counts a member online for two of these windows and more. */
export const PULSE_MS = 30_000;

/** This feature's cache keys, kept here so nothing outside the feature depends on them. */
export const socialKeys = {
  overview: ['social', 'overview'] as const,
  pulse: ['social', 'pulse'] as const,
  myTables: ['rooms', 'mine'] as const,
};

const signedIn = (session: ReturnType<typeof useSession>) => session.status === 'signed-in';

/** Friends, requests, invites and blocks, polled while a screen shows them. */
export function useSocialOverview() {
  const session = useSession();
  return useQuery({
    queryKey: socialKeys.overview,
    queryFn: () => http.get<SocialOverview>(socialApi.overview),
    enabled: signedIn(session),
    refetchInterval: OVERVIEW_POLL_MS,
  });
}

/**
 * Tells the server this member is around and returns what the navigation badge counts. Runs in
 * the shell for every signed-in page; it pauses with the tab hidden, so presence fades out too.
 */
export function useSocialPulse() {
  const session = useSession();
  return useQuery({
    queryKey: socialKeys.pulse,
    queryFn: () => http.post<SocialPulse>(socialApi.presence),
    enabled: signedIn(session),
    refetchInterval: PULSE_MS,
    staleTime: PULSE_MS,
  });
}

/** The casual table I sit at, if any: where "invite to my table" sends friends. */
export function useMyTable() {
  const session = useSession();
  const { data } = useQuery({
    queryKey: socialKeys.myTables,
    queryFn: () => http.get<{ code: string; kind: RoomKind }[]>(roomApi.mine),
    enabled: signedIn(session),
  });
  return data?.find((table) => table.kind === 'casual')?.code ?? null;
}

/**
 * Posts a social write and adopts the overview it answers with; the badge refreshes too.
 * Resolves to true, so `useAction().run(…)` tells success (true) from failure (undefined).
 */
export function useSocialWrite() {
  const client = useQueryClient();
  return useCallback(
    async (path: string, body: unknown) => {
      const overview = await http.post<SocialOverview | undefined>(path, body);
      if (overview) client.setQueryData(socialKeys.overview, overview);
      void client.invalidateQueries({ queryKey: socialKeys.pulse });
      return true;
    },
    [client],
  );
}
