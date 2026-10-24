import { RuleError } from './errors';

/**
 * Small readers for untrusted input (commands, options) coming from the network. Each one
 * returns a typed value or throws a RuleError, so `parseCommand` stays a few readable lines.
 */
const invalid = (what: string) => new RuleError(`Invalid ${what}.`, 'INVALID_INPUT');

export function readRecord(input: unknown, what = 'command'): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw invalid(what);
  return input as Record<string, unknown>;
}

export function readOneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  what: string,
): T {
  if (!allowed.includes(value as T)) throw invalid(what);
  return value as T;
}

/** A string that is no longer than `max` characters and is not empty. */
export function readString(value: unknown, what: string, max = 200): string {
  if (typeof value !== 'string' || !value.length || value.length > max) throw invalid(what);
  return value;
}

export function readInteger(value: unknown, what: string, range: { min: number; max: number }) {
  if (!Number.isInteger(value) || (value as number) < range.min || (value as number) > range.max)
    throw invalid(what);
  return value as number;
}

export function readBoolean(value: unknown, what: string): boolean {
  if (typeof value !== 'boolean') throw invalid(what);
  return value;
}

/** Applies `read` unless the value is absent. */
export const readOptional = <T>(value: unknown, read: (value: unknown) => T): T | undefined =>
  value === undefined ? undefined : read(value);
