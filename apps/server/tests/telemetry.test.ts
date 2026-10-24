import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import {
  MAX_TELEMETRY_DETAIL,
  MAX_TELEMETRY_EVENTS,
  readTelemetryBatch,
  telemetryApi,
  type TelemetryEvent,
} from '@cardgame/protocol';
import { createApi, createServices } from '../src/api';
import { createApplication } from '../src/app';
import { loadConfig } from '../src/core/config';
import { Router } from '../src/core/http/router';
import { ApiError } from '../src/core/http/errors';
import {
  ALERT_THROTTLE_MS,
  Alerter,
  DAILY_ALERT_CAP,
  type Send,
} from '../src/features/telemetry/alerts';
import { redact, stackHash } from '../src/features/telemetry/error-log';
import { telemetryRoutes } from '../src/features/telemetry/routes';
import {
  DAILY_ROW_CAP,
  DAY_MS,
  MAX_TELEMETRY_ROWS,
  TELEMETRY_RETENTION_MS,
  TelemetryStore,
} from '../src/features/telemetry/store';
import { testConfig, testServices } from './support';

const WEBHOOK = 'https://ntfy.example/topic';
const vital: TelemetryEvent = {
  kind: 'vital',
  name: 'LCP',
  value: 1200,
  screen: 'home',
  device: 'phone',
};
const count = (db: ReturnType<typeof testServices>['services']['db'], table: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

/** A webhook that records what it was sent instead of calling anyone. */
function fakeFetch() {
  const calls: { url: string; init: RequestInit }[] = [];
  const send: Send = (url, init) => {
    calls.push({ url, init });
    return Promise.resolve({ ok: true, status: 204 });
  };
  return { calls, send };
}

describe('telemetry batch validation', () => {
  it('drops malformed events and refuses a malformed envelope', () => {
    const long = 'x'.repeat(MAX_TELEMETRY_DETAIL * 2);
    const batch = readTelemetryBatch({
      events: [
        vital,
        { ...vital, kind: 'secret' },
        { ...vital, value: -1 },
        { ...vital, screen: 'room/ABCDE' },
        { ...vital, kind: 'error', name: 'script', value: 1, detail: long },
      ],
    });
    expect(batch?.events).toHaveLength(2);
    expect(batch?.events[1]?.detail).toHaveLength(MAX_TELEMETRY_DETAIL);
    expect(readTelemetryBatch({ events: 'no' })).toBeNull();
    expect(readTelemetryBatch({ events: Array(MAX_TELEMETRY_EVENTS + 1).fill(vital) })).toBeNull();
  });
});

describe('telemetry store caps', () => {
  it('stops at the daily cap and starts again the next day', () => {
    const { services, clock } = testServices();
    const store = new TelemetryStore(services.db, services.now);
    const insert = services.db.prepare(
      "INSERT INTO telemetry (at, kind, name, value, screen, device) VALUES (?, 'vital', 'LCP', 1, 'home', 'phone')",
    );
    services.db.transaction(() => {
      for (let i = 0; i < DAILY_ROW_CAP - 1; i++) insert.run(clock.now);
    })();
    expect(store.record([vital, vital, vital])).toBe(1);
    expect(store.record([vital])).toBe(0);
    clock.now += DAY_MS;
    expect(store.record([vital, vital])).toBe(2);
  });

  it('keeps at most the total row cap and sweeps old samples', () => {
    const { services, clock } = testServices();
    const store = new TelemetryStore(services.db, services.now);
    const insert = services.db.prepare(
      "INSERT INTO telemetry (id, at, kind, name, value, screen, device) VALUES (?, 0, 'vital', 'LCP', 1, 'home', 'phone')",
    );
    insert.run(1);
    insert.run(MAX_TELEMETRY_ROWS);
    store.record([vital]);
    expect(services.db.prepare('SELECT id FROM telemetry WHERE id = 1').get()).toBeUndefined();
    clock.now += TELEMETRY_RETENTION_MS + 1;
    store.sweep();
    expect(count(services.db, 'telemetry')).toBe(0);
  });
});

describe('error log', () => {
  it('masks secrets and hashes the stack shape, not its positions', () => {
    expect(redact('bad password=hunter2 token: "abc"')).toBe(
      'bad password=[redacted] token: [redacted]',
    );
    const one = stackHash('TypeError', ['at play (/app/a.ts:10:5)'], 'x');
    expect(stackHash('TypeError', ['at play (/app/a.ts:12:9)'], 'y')).toBe(one);
    expect(stackHash('RangeError', ['at play (/app/a.ts:10:5)'], 'x')).not.toBe(one);
  });

  it('records the same unexpected error once, with a count', async () => {
    const { services } = testServices();
    const router = new Router();
    telemetryRoutes(router, services, fakeFetch().send);
    const errors = [0, 1].map(() => new Error('boom'));
    for (const error of errors)
      await router.reportUnexpected({ error, source: 'request', route: 'GET /api/x' });
    const row = services.db.prepare('SELECT route, count, message FROM error_log').get();
    expect(row).toEqual({ route: 'GET /api/x', count: 2, message: 'Error: boom' });
  });
});

describe('alerts', () => {
  it('sends one alert per error per window, within a daily cap', () => {
    const { calls, send } = fakeFetch();
    const clock = { now: 0 };
    const alerter = new Alerter({ url: WEBHOOK, send, now: () => clock.now });
    alerter.notify('a', 'first');
    alerter.notify('a', 'again');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.init.body).toBe('first');
    clock.now += ALERT_THROTTLE_MS;
    alerter.notify('a', 'later');
    for (let i = 0; i < DAILY_ALERT_CAP * 2; i++) alerter.notify(`k${i}`, 'flood');
    expect(calls).toHaveLength(DAILY_ALERT_CAP);
  });

  it('speaks JSON to Discord and sends nothing without a valid URL', () => {
    const { calls, send } = fakeFetch();
    new Alerter({ url: 'https://discord.com/api/webhooks/1', send, now: () => 0 }).notify(
      'a',
      'hi',
    );
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({
      content: expect.stringContaining('hi'),
    });
    expect(new Alerter({ url: undefined, send, now: () => 0 }).notify('a', 'hi')).toBeNull();
  });

  it('alerts about a crash reported to the api', async () => {
    const { calls, send } = fakeFetch();
    const config = { ...testConfig(), alertWebhookUrl: WEBHOOK };
    const services = createServices(config);
    const router = new Router();
    telemetryRoutes(router, services, send);
    await router.reportUnexpected({
      error: new Error('down'),
      source: 'uncaughtException',
      route: 'process',
    });
    expect(String(calls[0]?.init.body)).toContain('uncaughtException · process');
    const api = createApi(loadConfig({ DB_PATH: ':memory:', LOG_REQUESTS: '0' }));
    await api.reportCrash({ error: new ApiError('x', 'X'), source: 'unhandledRejection' });
    expect(count(api.services.db, 'error_log')).toBe(1);
    api.stop();
  });
});

describe('telemetry over http', () => {
  let app: ReturnType<typeof createApplication>;
  let base = '';
  beforeEach(async () => {
    app = createApplication(testConfig());
    await new Promise<void>((done) => app.server.listen(0, '127.0.0.1', done));
    base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  });
  afterEach(() => app.close());
  const post = (body: unknown) =>
    fetch(base + telemetryApi.batch, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('stores a batch with route patterns only and answers 204', async () => {
    const api = (name: string) => ({ ...vital, kind: 'api', name, value: 40 });
    const reply = await post({ events: [vital, api('api/rooms/ABCDE'), api('api/nowhere')] });
    expect(reply.status).toBe(204);
    const names = app.api.services.db.prepare('SELECT name FROM telemetry ORDER BY id').all();
    expect(names).toEqual([{ name: 'LCP' }, { name: '/api/rooms/:code' }]);
    expect((await post({ events: 1 })).status).toBe(400);
  });

  it('logs a 500 with its route pattern and request id', async () => {
    Object.defineProperty(app.api.services.rooms, 'size', {
      get: () => {
        throw new Error('broken');
      },
    });
    const reply = await fetch(`${base}/api/health`);
    expect(reply.status).toBe(500);
    await new Promise((done) => setImmediate(done));
    const row = app.api.services.db.prepare('SELECT route, request_id FROM error_log').get();
    expect(row).toEqual({
      route: 'GET /api/health',
      request_id: reply.headers.get('x-request-id'),
    });
  });
});
