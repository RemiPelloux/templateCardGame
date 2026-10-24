import type { IncomingMessage, ServerResponse } from 'node:http';
import { accountApi, api } from '@cardgame/protocol';
import type { Config } from './core/config';
import { migrate, openDatabase } from './core/database';
import { DomainEvents } from './core/events';
import type { Services } from './core/feature';
import { Attempts, attemptsMigration } from './core/http/attempts';
import { notFound } from './core/http/errors';
import { readCookie } from './core/http/io';
import { checkOrigin } from './core/http/policy';
import { createLimiter } from './core/http/rate-limit';
import {
  context,
  run,
  Router,
  sendError,
  type Context,
  type UnexpectedError,
} from './core/http/router';
import { FEATURES } from './features';
import { Accounts } from './features/accounts/accounts';
import { SESSION_COOKIE } from './features/accounts/sessions';
import { Inventory } from './features/economy/inventory';
import { Wallet } from './features/economy/wallet';
import { RoomService } from './features/rooms/room-service';
import { RoomStore } from './features/rooms/room-store';

/** How often features' background work (bots, queues, sweeps) runs. */
export const TICK_MS = 200;

/** Opens the database, migrates it, and builds the services every feature shares. */
export function createServices(config: Config, now = Date.now): Services {
  const db = openDatabase(config.dbPath);
  migrate(db, [attemptsMigration, ...FEATURES.flatMap((f) => f.migrations ?? [])], now);
  const events = new DomainEvents();
  const attempts = new Attempts(db, now);
  return {
    db,
    config,
    now,
    events,
    attempts,
    limit: createLimiter(now),
    accounts: new Accounts({ db, now, events, attempts, cost: config.passwordCost }),
    wallet: new Wallet(db, now),
    inventory: new Inventory(db, now),
    rooms: new RoomService({ store: new RoomStore(db), events, now }),
  };
}

const requestIdOf = (res: ServerResponse) => {
  const id = res.getHeader('X-Request-ID');
  return typeof id === 'string' ? id : undefined;
};

function exportRoute(router: Router, services: Services) {
  router.on('GET', accountApi.export, ({ me }) => {
    const id = me().id;
    return Object.fromEntries(
      FEATURES.filter((f) => f.exportData).map((f) => [f.name, f.exportData!(id, services)]),
    );
  });
}

/**
 * Starts every feature and answers `/api/` requests; anything else goes to `next` (static
 * files, the app shell). Used by the production server, by Vite in development and by tests.
 */
export function createApi(config: Config, services = createServices(config)) {
  const router = new Router();
  router.on('GET', api.health, () => ({
    ok: true,
    rooms: services.rooms.size,
    streams: services.rooms.live.size,
  }));
  for (const feature of FEATURES) feature.start?.(services);
  for (const feature of FEATURES) feature.routes?.(router, services);
  exportRoute(router, services);
  const ticker = setInterval(() => FEATURES.forEach((f) => f.tick?.(services)), TICK_MS);
  ticker.unref();

  function handle(req: IncomingMessage, res: ServerResponse, next: () => void) {
    const path = (req.url ?? '/').split('?')[0]!;
    if (!path.startsWith('/api/')) return next();
    const found = router.match(req.method ?? 'GET', path);
    if (!found) return sendError(res, notFound('Unknown endpoint.'));
    const player = services.accounts.resolve(readCookie(req, SESSION_COOKIE))?.player ?? null;
    const guarded = (ctx: Context) => {
      checkOrigin(req, services.config);
      return found.handler(ctx);
    };
    const report = (error: unknown) =>
      void router.reportUnexpected({
        error,
        source: 'request',
        route: `${req.method} ${found.path}`,
        requestId: requestIdOf(res),
      });
    void run(guarded, context(req, res, { params: found.params, player }), report);
  }

  function stop() {
    clearInterval(ticker);
    services.db.close();
  }

  /** Hands a process-level crash to the same listeners as a failed request (`index.ts`). */
  const reportCrash = (failure: Omit<UnexpectedError, 'route'>) =>
    router.reportUnexpected({ ...failure, route: 'process' });

  return { handle, stop, services, reportCrash };
}

export type Api = ReturnType<typeof createApi>;
