import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import {
  accountApi,
  dailyApi,
  rankedApi,
  roomApi,
  type DailyStartResponse,
  type DailyView,
  type RankedView,
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

/** A signed-up member's client: `call(path, method)` answers the status and JSON body. */
async function member(username: string) {
  let cookie = '';
  const call = async (path: string, method = 'GET', body?: unknown) => {
    const response = await fetch(base + path, {
      method,
      headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    cookie = response.headers.get('set-cookie')?.split(';')[0] ?? cookie;
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
    };
  };
  await call(accountApi.register, 'POST', { username, password: 'correct horse' });
  return call;
}

describe('competitive endpoints', () => {
  it('starts the daily challenge once and shows it', async () => {
    const call = await member('ada');
    expect(((await call(dailyApi.daily)).body as DailyView).status).toEqual({ state: 'new' });
    const { room } = (await call(dailyApi.start, 'POST')).body as DailyStartResponse;
    expect(((await call(roomApi.room(room))).body as RoomView).kind).toBe('daily');
    expect((await call(dailyApi.start, 'POST')).body).toEqual({ room });
    const view = (await call(dailyApi.daily)).body as DailyView;
    expect(view.status).toEqual({ state: 'playing', room });
    expect(JSON.stringify(view)).not.toMatch(/seed/i);
  });

  it('queues for a ranked duel and leaves the queue', async () => {
    const call = await member('ada');
    expect((await call(rankedApi.queue, 'POST')).body).toMatchObject({ state: 'searching' });
    const view = (await call(rankedApi.ranked)).body as RankedView;
    expect(view).toMatchObject({ rating: 1000, provisional: true, games: 0 });
    expect((await call(rankedApi.queue, 'DELETE')).body).toEqual({ state: 'idle' });
  });

  it('exports the member’s daily and ranked data', async () => {
    const call = await member('ada');
    await call(dailyApi.start, 'POST');
    const exported = (await call(accountApi.export)).body as Record<string, unknown>;
    expect(exported).toMatchObject({
      daily: { attempts: [{ finished: null }] },
      ranked: { rating: { rating: 1000 }, games: [] },
    });
  });

  it('needs a member', async () => {
    expect((await fetch(base + dailyApi.daily)).status).toBe(401);
    expect((await fetch(base + rankedApi.ranked)).status).toBe(401);
  });
});
