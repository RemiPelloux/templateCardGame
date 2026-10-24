import { readTelemetryBatch, telemetryApi, type TelemetryEvent } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { ApiError } from '../../core/http/errors';
import { clientAddress } from '../../core/http/policy';
import type { Router, UnexpectedError } from '../../core/http/router';
import { Alerter, alertText, type Send } from './alerts';
import { ErrorLog } from './error-log';
import { TelemetryStore } from './store';

/** Batches per minute and address: a page sends one every 30 s, plus one when hidden. */
const BATCHES_PER_MINUTE = 12;
const RELAXED = 10_000;

/**
 * API timings arrive as the path the browser saw; only the route pattern is stored, so room
 * codes and usernames never reach the table. Paths that are not an API route are dropped.
 */
function withPatterns(router: Router, events: readonly TelemetryEvent[]) {
  return events.flatMap((event) => {
    if (event.kind !== 'api') return [event];
    const pattern = router.patternOf(`/${event.name.split('?')[0]}`);
    return pattern ? [{ ...event, name: pattern }] : [];
  });
}

/** Records every unexpected error and alerts about it, throttled; never throws. */
export function errorRecorder({ db, now, config }: Services, send: Send) {
  const log = new ErrorLog(db, now);
  const alerter = new Alerter({ url: config.alertWebhookUrl, send, now });
  return (failure: UnexpectedError) => {
    try {
      const logged = log.record(failure);
      return alerter.notify(
        `${logged.source} ${logged.route} ${logged.stackHash}`,
        alertText(logged),
      );
    } catch (error) {
      console.error(JSON.stringify({ event: 'error_log_failed', message: String(error) }));
      return null;
    }
  };
}

/** `POST /api/telemetry` (anonymous, 204) and the error log behind the router's 500s. */
export function telemetryRoutes(router: Router, services: Services, send: Send = fetch) {
  const { config, limit } = services;
  const store = new TelemetryStore(services.db, services.now);
  router.onUnexpectedError(errorRecorder(services, send));
  router.on('POST', telemetryApi.batch, async ({ req, body }) => {
    limit(
      `telemetry:${clientAddress(req, config)}`,
      config.relaxedLimits ? RELAXED : BATCHES_PER_MINUTE,
    );
    const batch = readTelemetryBatch(await body());
    if (!batch) throw new ApiError('Invalid telemetry batch.', 'INVALID_INPUT');
    store.record(withPatterns(router, batch.events));
  });
}
