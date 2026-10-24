import type { Plugin } from 'vite';
import { createApi, type Api } from './api';
import { loadConfig } from './core/config';

/**
 * Mounts the real API inside Vite's dev and preview servers: one process, one port, hot reload
 * for the web app and the same rules, rooms and database as production.
 */
export function gameServerPlugin(): Plugin {
  let api: Api | undefined;
  const handle = () =>
    (api ??= createApi(loadConfig({ ...process.env, LOG_REQUESTS: '0' }))).handle;
  return {
    name: 'card-game-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => handle()(req, res, next));
      server.httpServer?.on('close', () => api?.stop());
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => handle()(req, res, next));
      server.httpServer?.on('close', () => api?.stop());
    },
  };
}
