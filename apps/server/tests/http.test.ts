import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import {
  accountApi,
  api,
  roomApi,
  type ErrorBody,
  type RegisterResponse,
  type RoomView,
} from '@cardgame/protocol';
import { createApplication } from '../src/app';
import { testConfig } from './support';

let app: ReturnType<typeof createApplication>;
let base = '';

beforeEach(async () => {
  app = createApplication(testConfig());
  await new Promise<void>((done) => app.server.listen(0, '127.0.0.1', done));
  base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
});
afterEach(() => app.close());

type Reply = { status: number; body: unknown };

/** A browser-like client that keeps its session cookie. */
function client() {
  let cookie = '';
  return async (
    path: string,
    init: { method?: string; body?: unknown; origin?: string } = {},
  ): Promise<Reply> => {
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

const register = (call: ReturnType<typeof client>, username: string) =>
  call(accountApi.register, { body: { username, password: 'correct horse' } });

describe('http api', () => {
  it('answers health checks', async () => {
    expect((await client()(api.health)).body).toMatchObject({ ok: true });
  });

  it('registers, keeps the session, signs out', async () => {
    const call = client();
    expect((await call(roomApi.rooms, { body: {} })).status).toBe(401);
    const created = await register(call, 'ada');
    expect((created.body as RegisterResponse).codes).toHaveLength(8);
    expect((await call(accountApi.session)).body).toMatchObject({ player: { name: 'ada' } });
    expect((await call(accountApi.logout, { body: {} })).status).toBe(204);
    expect((await call(accountApi.session)).status).toBe(401);
    expect(
      (await call(accountApi.login, { body: { username: 'ada', password: 'correct horse' } }))
        .status,
    ).toBe(200);
  });

  it('returns translatable errors with a code and parameters', async () => {
    const reply = await register(client(), 'a');
    expect(reply.status).toBe(400);
    expect((reply.body as ErrorBody).error).toMatchObject({
      code: 'INVALID_USERNAME',
      params: { min: 3, max: 20 },
    });
  });

  it('runs a table from creation to the first move', async () => {
    const call = client();
    await register(call, 'ada');
    const room = (await call(roomApi.rooms, { body: {} })).body as RoomView;
    await call(roomApi.seats(room.code), { body: { action: 'addBot' } });
    const dealt = (await call(roomApi.start(room.code), { body: {} })).body as RoomView;
    expect(dealt.match?.state.hand.length).toBe(7);
    const move = dealt.match!.legal[0];
    if (move)
      expect(
        (
          await call(roomApi.commands(room.code), {
            body: { revision: dealt.revision, command: move },
          })
        ).status,
      ).toBe(200);
    const illegal = await call(roomApi.commands(room.code), {
      body: { revision: 0, command: { type: 'fly' } },
    });
    expect((illegal.body as ErrorBody).error.code).toBeTruthy();
  });

  it('exports every feature’s data for the member', async () => {
    const call = client();
    await register(call, 'ada');
    const exported = (await call(accountApi.export)).body as Record<string, unknown>;
    expect(exported).toMatchObject({
      accounts: { account: { name: 'ada' } },
      economy: { coins: 0 },
    });
  });

  it('refuses cross-site writes', async () => {
    const reply = await client()(accountApi.login, {
      body: { username: 'x', password: 'y' },
      origin: 'https://evil.example',
    });
    expect(reply.status).toBe(403);
  });

  it('answers unknown endpoints and pages with 404s, never the app shell', async () => {
    expect((await client()('/api/nope')).status).toBe(404);
    expect((await fetch(`${base}/not-a-page`)).status).toBe(404);
  });

  it('sends security headers', async () => {
    const response = await fetch(base + api.health);
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");
    expect(response.headers.get('x-frame-options')).toBe('DENY');
  });
});
