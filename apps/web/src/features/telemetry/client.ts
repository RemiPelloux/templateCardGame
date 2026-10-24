import {
  MAX_TELEMETRY_DETAIL,
  MAX_TELEMETRY_EVENTS,
  parseRoute,
  telemetryApi,
  type Device,
  type TelemetryEvent,
} from '@cardgame/protocol';

const FLUSH_MS = 30_000;
/** Distinct errors reported per page load: a loop that throws must not flood the server. */
const MAX_ERRORS = 10;
/** Share of API calls whose duration is kept: a table polls often, a sample is enough. */
const API_SAMPLE = 0.25;
/** Fallback when the browser has no `requestIdleCallback` (Safari). */
const IDLE_FALLBACK_MS = 2_000;
const PHONE_MAX_PX = 760;
const TABLET_MAX_PX = 1_099;
/** Live streams stay open for minutes: their "duration" is not a response time. */
const STREAM_PATH = /\/events$/;
const QUERY = /\?\S*/g;

const queue: TelemetryEvent[] = [];
const seenErrors = new Set<string>();

const device = (): Device =>
  innerWidth <= PHONE_MAX_PX ? 'phone' : innerWidth <= TABLET_MAX_PX ? 'tablet' : 'desktop';
/** The page's route name: never the room code or the profile handle its address may carry. */
const screen = () => parseRoute(location.pathname)?.name ?? 'unknown';

function push(event: Omit<TelemetryEvent, 'screen' | 'device'>) {
  queue.push({ ...event, screen: screen(), device: device() });
  if (queue.length >= MAX_TELEMETRY_EVENTS) flush();
}

/** `keepalive` lets the last batch leave while the tab closes; failures are not retried. */
function flush() {
  if (!queue.length) return;
  void fetch(telemetryApi.batch, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: queue.splice(0, MAX_TELEMETRY_EVENTS) }),
    credentials: 'omit',
    keepalive: true,
  }).catch(() => undefined);
}

function reportError(name: 'script' | 'promise', message: string) {
  const detail = message.replace(QUERY, '').slice(0, MAX_TELEMETRY_DETAIL);
  if (seenErrors.size >= MAX_ERRORS || seenErrors.has(`${name}:${detail}`)) return;
  seenErrors.add(`${name}:${detail}`);
  push({ kind: 'error', name, value: 1, detail });
}

function watchErrors() {
  addEventListener('error', (event) => reportError('script', event.message || 'Script error'));
  addEventListener('unhandledrejection', (event) => {
    const reason: unknown = event.reason;
    reportError('promise', reason instanceof Error ? reason.message : String(reason));
  });
}

/** API durations come from the browser's own Resource Timing: no request is wrapped. */
function watchApi() {
  if (typeof PerformanceObserver === 'undefined') return;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const { origin, pathname } = new URL(entry.name, location.href);
      if (origin !== location.origin || !pathname.startsWith('/api/')) continue;
      if (pathname === telemetryApi.batch || STREAM_PATH.test(pathname)) continue;
      if (Math.random() >= API_SAMPLE) continue;
      // Sent without its query; the server keeps only the route pattern, not this path.
      push({ kind: 'api', name: pathname.slice(1), value: Math.round(entry.duration) });
    }
  }).observe({ type: 'resource', buffered: true });
}

async function watchVitals() {
  const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import('web-vitals');
  const vital = ({ name, value }: { name: string; value: number }) =>
    push({ kind: 'vital', name, value: Math.round(value * 1000) / 1000 });
  for (const watch of [onLCP, onINP, onCLS, onFCP, onTTFB]) watch(vital);
}

/**
 * Players who ask not to be tracked (Do Not Track or Global Privacy Control) send nothing at
 * all, even though every measurement is anonymous: their browser said so, we take it literally.
 */
export function telemetryAllowed(nav: Navigator & { globalPrivacyControl?: boolean } = navigator) {
  return nav.doNotTrack !== '1' && nav.globalPrivacyControl !== true;
}

function start() {
  watchErrors();
  watchApi();
  void watchVitals().catch(() => undefined);
  setInterval(flush, FLUSH_MS);
  addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}

/** Field measurements (Web Vitals, API timings, script errors), started once the app is idle. */
export function startTelemetry() {
  if (!telemetryAllowed()) return;
  if ('requestIdleCallback' in window) requestIdleCallback(start);
  else setTimeout(start, IDLE_FALLBACK_MS);
}
