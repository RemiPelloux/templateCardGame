import type { LoggedError } from './error-log';
import { DAY_MS } from './store';

/** One alert per distinct error at most this often: a loop failing every second stays quiet. */
export const ALERT_THROTTLE_MS = 15 * 60_000;
/** Alerts per UTC day, every error together; the last one of the day says so. */
export const DAILY_ALERT_CAP = 24;
/** A slow or dead webhook never holds the server: the request gives up after this. */
export const ALERT_TIMEOUT_MS = 4_000;
const MAX_ALERT_LENGTH = 400;
const TITLE = 'Card Game Template';
const CAP_NOTE = '\n(Last alert today: run scripts/ops/list-errors.mjs for the rest.)';
/** Chat services that want JSON, and the field holding the text; anything else gets plain text. */
const CHAT_HOOKS: Record<string, 'content' | 'text'> = {
  'discord.com': 'content',
  'discordapp.com': 'content',
  'hooks.slack.com': 'text',
};

export type Send = (url: string, init: RequestInit) => Promise<{ ok: boolean; status: number }>;

/** Discord and Slack take JSON; anything else (ntfy, a custom endpoint) gets a plain-text POST. */
export function alertRequest(url: string, text: string): RequestInit {
  const field = CHAT_HOOKS[new URL(url).hostname];
  if (field)
    return {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: `${TITLE} · ${text}` }),
    };
  return {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain; charset=utf-8', Title: TITLE, Tags: 'warning' },
    body: text,
  };
}

export const alertText = (error: LoggedError) =>
  `${error.source}${error.count > 1 ? ` ×${error.count}` : ''} · ${error.route}\n${error.message}`;

function usable(url: string | undefined) {
  try {
    return url && /^https?:$/.test(new URL(url).protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Throttled, fire-and-forget webhook alerts; without a URL nothing is ever sent. */
export class Alerter {
  private readonly url: string | undefined;
  private readonly sent = new Map<string, number>();
  private today = { day: -1, count: 0 };
  private readonly send: Send;
  private readonly now: () => number;

  constructor(deps: { url: string | undefined; send: Send; now: () => number }) {
    this.url = usable(deps.url);
    this.send = deps.send;
    this.now = deps.now;
    if (deps.url && !this.url)
      console.error(JSON.stringify({ event: 'alert_config_invalid', name: 'ALERT_WEBHOOK_URL' }));
  }

  /** Sends `text` unless `key` was alerted recently or today's cap is spent; null if skipped. */
  notify(key: string, text: string): Promise<void> | null {
    if (!this.url || !this.allowed(key)) return null;
    const last = this.today.count === DAILY_ALERT_CAP;
    const body = `${text.slice(0, MAX_ALERT_LENGTH)}${last ? CAP_NOTE : ''}`;
    const init = { ...alertRequest(this.url, body), signal: AbortSignal.timeout(ALERT_TIMEOUT_MS) };
    return this.send(this.url, init).then(
      (response) => this.failed(response.ok ? undefined : `HTTP ${response.status}`),
      (error: unknown) => this.failed(error instanceof Error ? error.name : 'Error'),
    );
  }

  private allowed(key: string) {
    const at = this.now();
    const day = Math.floor(at / DAY_MS);
    if (this.today.day !== day) {
      this.today = { day, count: 0 };
      for (const [k, time] of this.sent) if (at - time >= ALERT_THROTTLE_MS) this.sent.delete(k);
    }
    if (this.today.count >= DAILY_ALERT_CAP) return false;
    if (at - (this.sent.get(key) ?? -Infinity) < ALERT_THROTTLE_MS) return false;
    this.sent.set(key, at);
    this.today.count++;
    return true;
  }

  /** Logged without the address: a webhook URL is a secret. */
  private failed(reason: string | undefined) {
    if (reason) console.error(JSON.stringify({ event: 'alert_failed', message: reason }));
  }
}
