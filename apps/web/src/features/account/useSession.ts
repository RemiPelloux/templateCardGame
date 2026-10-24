import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  accountApi,
  type Player,
  type RegisterResponse,
  type SessionResponse,
} from '@cardgame/protocol';
import type { Locale } from '@cardgame/i18n';
import { keys } from '../../app/query';
import { useI18n } from '../../i18n/I18nProvider';
import { http, isUnauthorized, RequestError } from '../../net/http';

export type Session =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'offline' }
  | { status: 'signed-in'; player: Player };

/** Who is signed in, shared by every screen through the query cache. */
export function useSession() {
  const query = useQuery({
    queryKey: keys.session,
    queryFn: () =>
      http.get<SessionResponse>(accountApi.session).catch((error: unknown) => {
        if (isUnauthorized(error)) return null;
        throw error;
      }),
  });
  if (query.isPending) return { status: 'loading' } as Session;
  if (query.error)
    return { status: (query.error as RequestError).status === 0 ? 'offline' : 'guest' } as Session;
  return query.data
    ? ({ status: 'signed-in', player: query.data.player } as Session)
    : ({ status: 'guest' } as Session);
}

/** Sign-in, sign-up and sign-out, each updating the shared session and the language. */
export function useAuth() {
  const client = useQueryClient();
  const { setLocale, locale } = useI18n();
  const adopt = useCallback(
    (session: SessionResponse) => {
      client.setQueryData(keys.session, session);
      if (session.locale) setLocale(session.locale);
      else void http.post(accountApi.locale, { locale }).catch(() => {});
    },
    [client, setLocale, locale],
  );
  return {
    login: async (username: string, password: string) => {
      adopt(await http.post<SessionResponse>(accountApi.login, { username, password }));
      return true;
    },
    register: async (username: string, password: string) => {
      const created = await http.post<RegisterResponse>(accountApi.register, {
        username,
        password,
      });
      adopt(created);
      return created.codes;
    },
    recover: async (username: string, code: string, password: string) => {
      adopt(await http.post<SessionResponse>(accountApi.recover, { username, code, password }));
      return true;
    },
    logout: async () => {
      await http.post(accountApi.logout);
      client.clear();
      client.setQueryData(keys.session, null);
    },
    /** Remembers the language on the account too, when signed in. */
    changeLocale: (next: Locale) => {
      setLocale(next);
      if (client.getQueryData(keys.session))
        void http.post(accountApi.locale, { locale: next }).catch(() => {});
    },
  };
}
