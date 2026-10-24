import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { api, type ErrorBody, type RoomView } from '@cardgame/protocol';
import { createApplication } from '../src/app';
import { loadConfig } from '../src/config';

let app: ReturnType<typeof createApplication>;
let base = '';

beforeEach(async () => {
  app = createApplication(
    loadConfig({ DB_PATH: ':memory:', LOG_REQUESTS: '0', STATIC_DIR: '/nonexistent' }),
  );
  await new Promise<void>((done) => app.server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});
afterEach(() => app.close());

/** A browser-like client that keeps its session cookie. */
function client() {
  let cookie = '';
  return async (path: string, init: { method?: string; body?: unknown; origin?: string } = {}) => {
    const response = await fetch(base + path, {
      method: init.method ?? (init.body ? 'POST' : 'GET'),
      headers: {
        cookie,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(init.origin ? { origin: init.origin } : {}),
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    cookie = response.headers.get('set-cookie')?.split(';')[0] ?? cookie;
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  };
}

describe('http api', () => {
  it('answers health checks', async () => {
    expect((await client()(api.health)).body).toMatchObject({ ok: true });
  });

  it('needs a session for rooms and refuses bad names', async () => {
    const call = client();
    expect((await call(api.rooms, { body: {} })).status).toBe(401);
    expect((await call(api.session, { body: { name: '   ' } })).status).toBe(400);
    expect((await call(api.session, { body: { name: 'Alice' } })).body).toMatchObject({
      player: { name: 'Alice' },
    });
    expect((await call(api.session)).status).toBe(200);
  });

  it('runs a table from creation to the first move', async () => {
    const call = client();
    await call(api.session, { body: { name: 'Alice' } });
    const room = (await call(api.rooms, { body: {} })).body as RoomView;
    await call(api.seats(room.code), { body: { action: 'addBot' } });
    const dealt = (await call(api.start(room.code), { body: {} })).body as RoomView;
    expect(dealt.match?.state.hand.length).toBe(7);
    const move = dealt.match!.legal[0];
    if (move) {
      const after = await call(api.commands(room.code), {
        body: { revision: dealt.revision, command: move },
      });
      expect(after.status).toBe(200);
    }
    const illegal = await call(api.commands(room.code), {
      body: { revision: 0, command: { type: 'fly' } },
    });
    expect(illegal.status).toBeGreaterThanOrEqual(400);
    expect((illegal.body as ErrorBody).error.code).toBeTruthy();
  });

  it('refuses cross-site writes', async () => {
    const call = client();
    const response = await call(api.session, {
      body: { name: 'Mallory' },
      origin: 'https://evil.example',
    });
    expect(response.status).toBe(403);
  });

  it('answers unknown endpoints and pages with 404s, never the app shell', async () => {
    const call = client();
    expect((await call('/api/nope')).status).toBe(404);
    expect((await fetch(`${base}/not-a-page`)).status).toBe(404);
  });

  it('sends security headers', async () => {
    const response = await fetch(base + api.health);
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });
});
