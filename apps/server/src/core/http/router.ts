import type { IncomingMessage, ServerResponse } from 'node:http';
import { isRuleError } from '@cardgame/engine';
import type { Player } from '@cardgame/protocol';
import { ApiError, errorBody, unauthorized } from './errors';
import { readJson, sendJson } from './io';

const NO_CONTENT = 204;
const SERVER_ERROR = 500;

export type Context = {
  req: IncomingMessage;
  res: ServerResponse;
  params: string[];
  player: Player | null;
  body(): Promise<Record<string, unknown>>;
  /** The signed-in player, or a 401. */
  me(): Player;
};

/** A handler returns the JSON body to send, `undefined` for 204, or takes over `res` (streams). */
type Handler = (ctx: Context) => unknown;
type Route = { method: string; path: string; pattern: RegExp; handler: Handler };
/** A route found for a request: its handler, its path parameters and its declared path. */
export type Match = { handler: Handler; params: string[]; path: string };

/**
 * An unexpected error (a would-be 500, or a process crash), as listeners see it. `route` is the
 * declared pattern (`POST /api/rooms/:code/commands`), never the requested path or its query.
 */
export type UnexpectedError = {
  error: unknown;
  source: 'request' | 'uncaughtException' | 'unhandledRejection';
  route: string;
  requestId?: string;
};
/** May return a promise (an alert in flight) so a crashing process can wait for it. */
export type ErrorListener = (failure: UnexpectedError) => unknown;
/** A route that writes its own response (a live stream) returns this. */
export const STREAMING = Symbol('streaming');

export class Router {
  private routes: Route[] = [];
  private listeners: ErrorListener[] = [];

  on(method: string, path: string, handler: Handler) {
    const source = path.replace(/:\w+/g, '([^/]+)');
    this.routes.push({ method, path, pattern: new RegExp(`^${source}$`), handler });
    return this;
  }

  /** The route for a request, with its path parameters; null when nothing matches. */
  match(method: string, path: string): Match | null {
    for (const route of this.routes) {
      const found = route.method === method ? route.pattern.exec(path) : null;
      if (found)
        return {
          handler: route.handler,
          params: found.slice(1).map(decodeURIComponent),
          path: route.path,
        };
    }
    return null;
  }

  /** The declared path a requested path answers to, whatever the method; null if none. */
  patternOf(path: string): string | null {
    return this.routes.find((route) => route.pattern.test(path))?.path ?? null;
  }

  /**
   * Subscribes to unexpected errors. The core only logs them; the telemetry feature uses this
   * to keep its error log and send alerts, without the router knowing about either.
   */
  onUnexpectedError(listener: ErrorListener) {
    this.listeners.push(listener);
    return this;
  }

  /** Tells every listener; a failing listener is ignored so the answer never changes. */
  reportUnexpected(failure: UnexpectedError): Promise<unknown> {
    const pending = this.listeners.map((listener) => {
      try {
        return Promise.resolve(listener(failure)).catch(() => undefined);
      } catch {
        return undefined;
      }
    });
    return Promise.allSettled(pending);
  }
}

export function context(
  req: IncomingMessage,
  res: ServerResponse,
  extra: { params: string[]; player: Player | null },
): Context {
  return {
    req,
    res,
    ...extra,
    body: () => readJson(req),
    me() {
      if (!extra.player) throw unauthorized();
      return extra.player;
    },
  };
}

/** Runs a handler; `onUnexpected` hears about any error that becomes a 500. */
export async function run(handler: Handler, ctx: Context, onUnexpected?: (error: unknown) => void) {
  try {
    const result = await handler(ctx);
    if (result === STREAMING) return;
    if (result === undefined) return void ctx.res.writeHead(NO_CONTENT).end();
    sendJson(ctx.res, 200, result);
  } catch (error) {
    sendError(ctx.res, error, onUnexpected);
  }
}

/** Refusals keep their message; anything unexpected is logged and hidden behind a generic 500. */
export function sendError(
  res: ServerResponse,
  error: unknown,
  onUnexpected?: (error: unknown) => void,
) {
  if (error instanceof ApiError)
    return sendJson(res, error.status, errorBody(error.code, error.message, error.params));
  if (isRuleError(error))
    return sendJson(res, 400, errorBody(error.code, error.message, error.params));
  console.error(
    JSON.stringify({ event: 'error', message: String((error as Error)?.stack ?? error) }),
  );
  sendJson(res, SERVER_ERROR, errorBody('INTERNAL', 'Something went wrong.'));
  onUnexpected?.(error);
}
