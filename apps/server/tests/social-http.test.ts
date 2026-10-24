import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import {
  accountApi,
  handleOf,
  roomApi,
  socialApi,
  type RegisterResponse,
  type RoomView,
  type SocialOverview,
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

/** A signed-in member: their handle and a fetch that keeps their cookie. */
async function member(username: string) {
  let cookie = '';
  const call = async <T>(path: string, body?: unknown) => {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { cookie, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    cookie = response.headers.get('set-cookie')?.split(';')[0] ?? cookie;
    return {
      status: response.status,
      body: (response.status === 204 ? null : await response.json()) as T,
    };
  };
  const created = await call<RegisterResponse>(accountApi.register, {
    username,
    password: 'correct horse',
  });
  return { call, handle: handleOf(created.body.player) };
}

describe('social http api', () => {
  it('befriends, pings, invites and reports over HTTP', async () => {
    const ada = await member('ada');
    const bob = await member('bob');
    expect((await ada.call(socialApi.request, { handle: bob.handle })).status).toBe(200);
    const accepted = await bob.call<SocialOverview>(socialApi.accept, { handle: ada.handle });
    expect(accepted.body.friends).toMatchObject([{ name: 'ada', presence: 'offline' }]);
    await ada.call(socialApi.presence, {});
    const { body: room } = await ada.call<RoomView>(roomApi.rooms, {});
    const invited = await ada.call(socialApi.invite, { handle: bob.handle, room: room.code });
    expect(invited.status).toBe(204);
    expect(await bob.call(socialApi.presence, {})).toMatchObject({
      body: { requests: 0, invites: 1 },
    });
    const { body: overview } = await bob.call<SocialOverview>(socialApi.overview);
    expect(overview.friends[0]!.presence).toBe('playing');
    const report = await bob.call(socialApi.report, { handle: ada.handle, reason: 'spam' });
    expect(report.status).toBe(204);
    expect((await bob.call<{ social: unknown }>(accountApi.export)).body.social).toBeTruthy();
  });

  it('refuses guests and translates refusals into codes', async () => {
    const guest = await fetch(base + socialApi.overview);
    expect(guest.status).toBe(401);
    const ada = await member('ada');
    const unknown = await ada.call(socialApi.request, { handle: 'nobody#1234' });
    expect(unknown).toMatchObject({ status: 404, body: { error: { code: 'UNKNOWN_PLAYER' } } });
  });
});
