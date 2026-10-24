import { useCallback, useEffect, useState } from 'react';
import { api, type Player, type SessionResponse } from '@cardgame/protocol';
import { http, RequestError } from '../net/http';

export type SessionState =
  | { status: 'loading' }
  | { status: 'guest' }
  | { status: 'signed-in'; player: Player }
  | { status: 'offline' };

/** The guest identity kept in an HttpOnly cookie: who you are at online tables. */
export function useSession() {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  useEffect(() => {
    http.get<SessionResponse>(api.session).then(
      ({ player }) => setState({ status: 'signed-in', player }),
      (error: unknown) =>
        setState({
          status: error instanceof RequestError && error.status === 0 ? 'offline' : 'guest',
        }),
    );
  }, []);
  const signIn = useCallback(async (name: string) => {
    const { player } = await http.post<SessionResponse>(api.session, { name });
    setState({ status: 'signed-in', player });
  }, []);
  const signOut = useCallback(async () => {
    await http.delete(api.session);
    setState({ status: 'guest' });
  }, []);
  return { state, signIn, signOut };
}
