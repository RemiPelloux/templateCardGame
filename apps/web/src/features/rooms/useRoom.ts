import { useCallback, useEffect, useRef, useState } from 'react';
import type { Command, Options } from '@cardgame/game';
import {
  CLOSED_REVISION,
  roomApi as api,
  type RoomView,
  type SeatsRequest,
} from '@cardgame/protocol';
import { http, RequestError } from '../../net/http';

/** A safety net under the live stream (a proxy may silently hold it back). */
const FALLBACK_POLL_MS = 15_000;
const STALE = 409;

/**
 * One room, kept current: the server announces each new revision over Server-Sent Events and
 * this hook fetches the viewer's own view. Responses older than what is shown are ignored.
 */
export function useRoom(code: string) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [error, setError] = useState<RequestError | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);

  const show = useCallback((view: RoomView) => {
    setRoom((shown) =>
      shown && shown.code === view.code && shown.revision > view.revision ? shown : view,
    );
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    try {
      const view = await http.get<RoomView>(api.room(code));
      if (ticket === generation.current) show(view);
    } catch (failure) {
      if (ticket === generation.current) setError(failure as RequestError);
    }
  }, [code, show]);

  useEffect(() => {
    void refresh();
    const stream = new EventSource(api.events(code));
    stream.addEventListener('room', (event) => {
      const { revision } = JSON.parse((event as MessageEvent<string>).data) as { revision: number };
      if (revision === CLOSED_REVISION) stream.close();
      void refresh();
    });
    const poll = setInterval(() => void refresh(), FALLBACK_POLL_MS);
    return () => {
      stream.close();
      clearInterval(poll);
    };
  }, [code, refresh]);

  const run = useCallback(
    async (action: () => Promise<RoomView | undefined>) => {
      setBusy(true);
      try {
        const view = await action();
        if (view) show(view);
      } catch (failure) {
        setError(failure as RequestError);
        if ((failure as RequestError).status === STALE) void refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh, show],
  );

  const post = (path: string, body?: unknown) => () => http.post<RoomView>(path, body);
  return {
    room,
    error,
    busy,
    dismissError: () => setError(null),
    join: () => run(post(api.join(code))),
    leave: () => run(() => http.post<undefined>(api.leave(code))),
    seats: (request: SeatsRequest) => run(post(api.seats(code), request)),
    start: (options?: Partial<Options>) => run(post(api.start(code), options ? { options } : {})),
    play: (command: Command) =>
      run(post(api.commands(code), { revision: room?.revision ?? 0, command })),
  };
}

export type RoomHandle = ReturnType<typeof useRoom>;
