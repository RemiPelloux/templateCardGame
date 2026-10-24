import { createHmac } from 'node:crypto';
import { deriveSeed } from '@cardgame/engine';

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;
const HALF_DAY_MS = DAY_MS / 2;
/** Two passes absorb a daylight-saving shift between now and the next midnight. */
const MIDNIGHT_PASSES = 2;
const SEED_BYTES_OFFSET = 0;

/** A calendar day in one time zone: `2026-10-24` and its number of days since 1970-01-01. */
export type Day = { key: string; number: number };

const formats = new Map<string, Intl.DateTimeFormat>();
function format(timeZone: string) {
  let found = formats.get(timeZone);
  if (!found) {
    found = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formats.set(timeZone, found);
  }
  return found;
}

/** The wall clock in `timeZone` at instant `time`. */
function wallClock(time: number, timeZone: string) {
  const parts = Object.fromEntries(
    format(timeZone)
      .formatToParts(time)
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
  const intoDay = parts.hour * HOUR_MS + parts.minute * MINUTE_MS + parts.second * SECOND_MS;
  return { ...parts, intoDay: intoDay + (time % SECOND_MS) };
}

/** The day `time` falls on in `timeZone`. */
export function dayAt(time: number, timeZone: string): Day {
  const clock = wallClock(time, timeZone);
  const number = Date.UTC(clock.year, clock.month - 1, clock.day) / DAY_MS;
  return fromNumber(number);
}

export function fromNumber(number: number): Day {
  return { key: new Date(number * DAY_MS).toISOString().slice(0, 'YYYY-MM-DD'.length), number };
}

/** The instant the day after `time` starts in `timeZone` (23 or 25 hours away on DST days). */
export function nextMidnight(time: number, timeZone: string): number {
  let guess = time - wallClock(time, timeZone).intoDay + DAY_MS;
  for (let pass = 0; pass < MIDNIGHT_PASSES; pass++) {
    const intoDay = wallClock(guess, timeZone).intoDay;
    // Past local noon means the guess landed late the previous evening: move forward.
    guess += intoDay > HALF_DAY_MS ? DAY_MS - intoDay : -intoDay;
  }
  return guess;
}

/**
 * The day's deal. The salt, a server secret, goes through an HMAC so that knowing past deals
 * (and even their seeds) tells nothing about tomorrow's; the seed itself never leaves the server.
 */
export function dailySeed(day: Day, salt: string): number {
  const secret = createHmac('sha256', salt)
    .update(day.key)
    .digest()
    .readUInt32BE(SEED_BYTES_OFFSET);
  return deriveSeed(day.number, secret);
}
