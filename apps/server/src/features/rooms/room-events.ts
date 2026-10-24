import type { IncomingMessage, ServerResponse } from 'node:http';

type Listener = (revision: number) => void;

/** A comment line every so often keeps proxies from closing a quiet stream. */
export const KEEPALIVE_MS = 20_000;
/** How long the browser waits before reconnecting a dropped stream. */
const RETRY_MS = 3000;

/**
 * Who listens to which room. Only “room changed, revision n” travels here: each client then
 * fetches its own view, so private hands only ever leave through the per-seat projection.
 */
export class RoomEvents {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(code: string, listener: Listener) {
    const set = this.listeners.get(code) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(code, set);
    return () => {
      set.delete(listener);
      if (!set.size) this.listeners.delete(code);
    };
  }

  emit(code: string, revision: number) {
    for (const listener of this.listeners.get(code) ?? []) listener(revision);
  }

  get size() {
    let total = 0;
    for (const set of this.listeners.values()) total += set.size;
    return total;
  }
}

/** Holds the response open as a Server-Sent Events stream of one room's revisions. */
export function streamRoom(
  req: IncomingMessage,
  res: ServerResponse,
  subscribe: (listener: Listener) => () => void,
) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`retry: ${RETRY_MS}\nevent: ready\ndata: {}\n\n`);
  const unsubscribe = subscribe((revision) =>
    res.write(`event: room\ndata: ${JSON.stringify({ revision })}\n\n`),
  );
  const keepalive = setInterval(() => res.write(': ping\n\n'), KEEPALIVE_MS);
  keepalive.unref();
  req.on('close', () => {
    clearInterval(keepalive);
    unsubscribe();
  });
}
