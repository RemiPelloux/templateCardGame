import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sirv from 'sirv';
import { parseRoute } from '@cardgame/protocol';
import { createApi } from './api/api';
import type { Config } from './config';
import { securityHeaders } from './http/policy';

const SHUTDOWN_MS = 10_000;
const TIMEOUTS = { request: 15_000, headers: 10_000, keepAlive: 5_000 };
/** Vite fingerprints built assets: they can be cached forever. */
const FINGERPRINTED = /[/\\]assets[/\\].+-[\w-]{8,}\.(js|css|woff2?|svg|png|webp)$/;

async function sendShell(dir: string, res: ServerResponse) {
  try {
    const html = await readFile(resolve(dir, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(res.req.method === 'HEAD' ? undefined : html);
  } catch {
    res
      .writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' })
      .end('Build the web app first: pnpm build');
  }
}

function logRequest(req: IncomingMessage, res: ServerResponse) {
  const started = performance.now();
  res.once('finish', () => {
    const path = (req.url ?? '/').split('?')[0]!;
    const route = path.startsWith('/api/')
      ? path.replace(/\/rooms\/[^/]+/, '/rooms/:code')
      : 'static';
    const durationMs = Math.round(performance.now() - started);
    console.log(
      JSON.stringify({
        event: 'request',
        id: res.getHeader('X-Request-ID'),
        method: req.method,
        route,
        status: res.statusCode,
        durationMs,
      }),
    );
  });
}

/** The whole app on one port: the JSON API, the built web app, and its shell for every page. */
export function createApplication(config: Config) {
  const api = createApi(config);
  const assets = sirv(config.staticDir, {
    etag: true,
    dev: !config.production,
    setHeaders: (res, path) =>
      res.setHeader(
        'Cache-Control',
        FINGERPRINTED.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache',
      ),
  });
  let draining = false;
  const server = createServer((req, res) => {
    securityHeaders(res, config);
    res.setHeader('X-Request-ID', randomUUID());
    if (config.logging) logRequest(req, res);
    if (draining) return void res.writeHead(503, { 'Retry-After': '5' }).end();
    api.handle(req, res, () =>
      assets(req, res, () => {
        const page =
          (req.method === 'GET' || req.method === 'HEAD') &&
          parseRoute((req.url ?? '/').split('?')[0]!);
        if (page) return void sendShell(config.staticDir, res);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found.');
      }),
    );
  });
  server.requestTimeout = TIMEOUTS.request;
  server.headersTimeout = TIMEOUTS.headers;
  server.keepAliveTimeout = TIMEOUTS.keepAlive;

  /** Stops taking requests, lets the current ones finish, then closes the database. */
  const close = () =>
    new Promise<void>((done, reject) => {
      draining = true;
      const deadline = setTimeout(() => server.closeAllConnections(), SHUTDOWN_MS).unref();
      server.close((error) => {
        clearTimeout(deadline);
        api.stop();
        if (error) reject(error);
        else done();
      });
      server.closeIdleConnections();
    });
  return { server, api, close };
}
