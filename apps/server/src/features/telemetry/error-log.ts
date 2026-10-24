import { createHash } from 'node:crypto';
import type { Db } from '../../core/database';
import type { UnexpectedError } from '../../core/http/router';
import { DAY_MS } from './store';

/** Server errors are kept longer than field samples: a rare crash matters for months. */
export const ERROR_RETENTION_MS = 90 * DAY_MS;
/** Distinct errors the table keeps; the least recently seen go first. */
export const MAX_ERROR_ROWS = 1_000;
export const MAX_MESSAGE_LENGTH = 240;
/** Frames kept and hashed: enough to place a bug, short enough to stay readable. */
const STACK_FRAMES = 8;
/** Only the innermost frames identify a bug; outer ones vary with whoever called it. */
const HASHED_FRAMES = 3;
const HASH_LENGTH = 16;
const REDACTED = '[redacted]';
/** `password=…`, `"token": "…"`, `cookie: …` keep their name, never their value. */
const SECRET_FIELD =
  /\b(password|passwd|token|cookie|session|secret|authorization|code)(["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;}]+)/gi;
/** Session tokens, password hashes and serialised state: long runs without spaces. */
const OPAQUE = /[A-Za-z0-9+/_=-]{32,}/g;
const CONTROL = /\p{Cc}+/gu;
/** `:12:5)` at the end of a frame: lines move between releases, the function does not. */
const POSITION = /:\d+:\d+\)?$/;

export const errorLogMigration = {
  id: 'telemetry.2-error-log',
  up: `
    CREATE TABLE error_log (id INTEGER PRIMARY KEY, first_at INTEGER NOT NULL,
      last_at INTEGER NOT NULL, source TEXT NOT NULL, route TEXT NOT NULL,
      stack_hash TEXT NOT NULL, message TEXT NOT NULL, stack TEXT NOT NULL, request_id TEXT,
      count INTEGER NOT NULL, UNIQUE (source, route, stack_hash));
    CREATE INDEX error_log_last ON error_log(last_at);
  `,
};

export type LoggedError = {
  source: string;
  route: string;
  stackHash: string;
  message: string;
  count: number;
};

/** The message with secrets masked and control characters blanked, cut to a readable length. */
export function redact(text: string) {
  return text
    .replace(CONTROL, ' ')
    .replace(SECRET_FIELD, `$1$2${REDACTED}`)
    .replace(OPAQUE, REDACTED)
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

function describe(error: unknown) {
  const name = error instanceof Error ? error.name : typeof error;
  const message = error instanceof Error ? error.message : String(error);
  const frames = (error instanceof Error ? (error.stack ?? '') : '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('at '))
    .slice(0, STACK_FRAMES);
  return { name, message: redact(`${name}: ${message}`), frames };
}

/** Same error name thrown from the same functions: one row, whatever its message says. */
export function stackHash(name: string, frames: readonly string[], message: string) {
  const shape = frames.length
    ? frames
        .slice(0, HASHED_FRAMES)
        .map((f) => f.replace(POSITION, ''))
        .join('\n')
    : message;
  return createHash('sha256').update(`${name}\n${shape}`).digest('hex').slice(0, HASH_LENGTH);
}

/** Unexpected server errors, deduplicated by place and stack shape, bounded in size and age. */
export class ErrorLog {
  constructor(
    private readonly db: Db,
    private readonly now: () => number,
  ) {}

  /** Stores one occurrence and returns the error with its count so far. */
  record(failure: UnexpectedError): LoggedError {
    const { name, message, frames } = describe(failure.error);
    const entry = {
      source: failure.source,
      route: failure.route,
      stackHash: stackHash(name, frames, message),
      message,
    };
    const row = this.db
      .prepare(
        `INSERT INTO error_log (first_at, last_at, source, route, stack_hash, message, stack,
           request_id, count) VALUES (@at, @at, @source, @route, @stackHash, @message, @stack,
           @requestId, 1)
         ON CONFLICT (source, route, stack_hash) DO UPDATE SET last_at = excluded.last_at,
           count = count + 1, message = excluded.message, request_id = excluded.request_id
         RETURNING count`,
      )
      .get({
        ...entry,
        at: this.now(),
        stack: frames.join('\n'),
        requestId: failure.requestId ?? null,
      });
    this.trim();
    return { ...entry, count: (row as { count: number }).count };
  }

  /** Deletes errors not seen within retention. */
  sweep() {
    this.db.prepare('DELETE FROM error_log WHERE last_at < ?').run(this.now() - ERROR_RETENTION_MS);
  }

  private trim() {
    this.db
      .prepare(
        `DELETE FROM error_log WHERE id NOT IN
           (SELECT id FROM error_log ORDER BY last_at DESC, id DESC LIMIT ?)`,
      )
      .run(MAX_ERROR_ROWS);
  }
}
