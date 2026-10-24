import type { IncomingMessage, ServerResponse } from 'node:http';
import { isRuleError } from '@cardgame/engine';
import type { Player } from '@cardgame/protocol';
import { ApiError, errorBody, unauthorized } from '../http/errors';
import { readJson, sendJson } from '../http/io';

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
type Route = { method: string; pattern: RegExp; handler: Handler };
/** A route that writes its own response (a live stream) returns this. */
export const STREAMING = Symbol('streaming');

export class Router {
  private routes: Route[] = [];

  on(method: string, path: string, handler: Handler) {
    const source = path.replace(/:\w+/g, '([^/]+)');
    this.routes.push({ method, pattern: new RegExp(`^${source}$`), handler });
    return this;
  }

  /** The route for a request, with its path parameters; null when nothing matches. */
  match(method: string, path: string): { handler: Handler; params: string[] } | null {
    for (const route of this.routes) {
      const found = route.method === method ? route.pattern.exec(path) : null;
      if (found) return { handler: route.handler, params: found.slice(1).map(decodeURIComponent) };
    }
    return null;
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

export async function run(handler: Handler, ctx: Context) {
  try {
    const result = await handler(ctx);
    if (result === STREAMING) return;
    if (result === undefined) return void ctx.res.writeHead(NO_CONTENT).end();
    sendJson(ctx.res, 200, result);
  } catch (error) {
    sendError(ctx.res, error);
  }
}

/** Refusals keep their message; anything unexpected is logged and hidden behind a generic 500. */
export function sendError(res: ServerResponse, error: unknown) {
  if (error instanceof ApiError)
    return sendJson(res, error.status, errorBody(error.code, error.message));
  if (isRuleError(error)) return sendJson(res, 400, errorBody(error.code, error.message));
  console.error(
    JSON.stringify({ event: 'error', message: String((error as Error)?.stack ?? error) }),
  );
  sendJson(res, SERVER_ERROR, errorBody('INTERNAL', 'Something went wrong.'));
}
