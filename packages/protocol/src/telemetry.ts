/**
 * Field telemetry, shared by the browser that measures and the server that stores. A batch
 * carries timings and script error messages only: never an account, a cookie, a room code, a
 * query string or anything a player typed.
 */
export const TELEMETRY_KINDS = ['vital', 'api', 'error'] as const;
export const DEVICES = ['phone', 'tablet', 'desktop'] as const;
export type TelemetryKind = (typeof TELEMETRY_KINDS)[number];
export type Device = (typeof DEVICES)[number];

export type TelemetryEvent = {
  kind: TelemetryKind;
  /** `LCP`, `INP`… for vitals, the API route pattern for timings, `script` or `promise` for errors. */
  name: string;
  /** Milliseconds, except CLS which is unitless; 1 for an error. */
  value: number;
  /** The route name the player was on (`room`, never the room's code). */
  screen: string;
  device: Device;
  /** An error's message, cut short. */
  detail?: string;
};
export type TelemetryBatch = { events: TelemetryEvent[] };

/** Events per batch: the browser flushes once it holds this many. */
export const MAX_TELEMETRY_EVENTS = 40;
export const MAX_TELEMETRY_DETAIL = 160;
/** Ten minutes: no honest timing is longer, and nothing negative is a timing. */
export const MAX_TELEMETRY_VALUE = 600_000;
const NAME = /^[A-Za-z][\w./:-]{0,59}$/;
const SCREEN = /^[a-z]{1,20}$/;

export const telemetryApi = { batch: '/api/telemetry' } as const;

const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  list.includes(value as T);

const isAmount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= MAX_TELEMETRY_VALUE;

function readEvent(value: unknown): TelemetryEvent | null {
  if (!value || typeof value !== 'object') return null;
  const { kind, name, value: amount, screen, device, detail } = value as Record<string, unknown>;
  if (!isOneOf(TELEMETRY_KINDS, kind) || !isOneOf(DEVICES, device)) return null;
  if (typeof name !== 'string' || !NAME.test(name)) return null;
  if (typeof screen !== 'string' || !SCREEN.test(screen)) return null;
  if (!isAmount(amount)) return null;
  if (detail !== undefined && typeof detail !== 'string') return null;
  const event: TelemetryEvent = { kind, name, value: amount, screen, device };
  return detail ? { ...event, detail: detail.slice(0, MAX_TELEMETRY_DETAIL) } : event;
}

/** The batch with its malformed events dropped, or null when the envelope itself is wrong. */
export function readTelemetryBatch(value: unknown): TelemetryBatch | null {
  const events = (value as { events?: unknown } | null)?.events;
  if (!Array.isArray(events) || events.length > MAX_TELEMETRY_EVENTS) return null;
  return { events: events.map(readEvent).filter((event) => event !== null) };
}
