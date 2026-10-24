import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Config } from '../config';
import { notFound } from '../http/errors';
import { readCookie } from '../http/io';
import { checkOrigin } from '../http/policy';
import { createLimiter } from '../http/rate-limit';
import { SESSION_COOKIE, Sessions } from '../identity/sessions';
import { RoomService } from '../rooms/room-service';
import { openDatabase } from '../storage/database';
import { RoomStore } from '../storage/room-store';
import { context, run, sendError, type Context } from './router';
import { routes } from './routes';

/** How often due bot moves are played and idle rooms closed. */
const TICK_MS = 200;
const SESSION_SWEEP_MS = 60 * 60 * 1000;

/**
 * Wires the services together and answers every `/api/` request; anything else goes to `next`
 * (static files, the app shell). Used by the production server and by Vite in development.
 */
export function createApi(config: Config) {
  const db = openDatabase(config.dbPath);
  const sessions = new Sessions(db);
  const rooms = new RoomService(new RoomStore(db));
  const router = routes({ config, sessions, rooms, limit: createLimiter() });
  const ticker = setInterval(() => rooms.tick(), TICK_MS);
  const sweeper = setInterval(() => sessions.sweep(), SESSION_SWEEP_MS);
  ticker.unref();
  sweeper.unref();

  function handle(req: IncomingMessage, res: ServerResponse, next: () => void) {
    const path = (req.url ?? '/').split('?')[0]!;
    if (!path.startsWith('/api/')) return next();
    const found = router.match(req.method ?? 'GET', path);
    if (!found) return sendError(res, notFound('Unknown endpoint.'));
    const player = sessions.resolve(readCookie(req, SESSION_COOKIE));
    const guarded = (ctx: Context) => {
      checkOrigin(req, config);
      return found.handler(ctx);
    };
    void run(guarded, context(req, res, { params: found.params, player }));
  }

  function stop() {
    clearInterval(ticker);
    clearInterval(sweeper);
    db.close();
  }

  return { handle, stop, rooms, sessions };
}

export type Api = ReturnType<typeof createApi>;
