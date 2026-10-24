import type { DailyStatus, DailyView, Player } from '@cardgame/protocol';
import type { MatchFinished } from '../../core/events';
import type { Services } from '../../core/feature';
import { ApiError } from '../../core/http/errors';
import { dailySeed, dayAt, DAY_MS, fromNumber, nextMidnight, type Day } from './calendar';
import { finishersOf, lineOf, topOf } from './ranking';

/** Bots dealt in with the member: the daily deal is always a three-handed game. */
export const DAILY_BOTS = 2;
/** Coins for finishing the day's challenge, and the extra for winning it. */
export const DAILY_REWARD = 20;
export const DAILY_WIN_BONUS = 30;
export const RANKING_TOP = 10;
export const PODIUM_SIZE = 3;
const CONFLICT = 409;

/** One member's attempt at one day's challenge; the result columns fill in at the end. */
type Attempt = {
  account_id: string;
  day: string;
  room: string;
  started: number;
  finished: number | null;
  won: number | null;
  score: number | null;
  moves: number | null;
  streak: number | null;
  reward: number | null;
};

const dayOfKey = (key: string): Day => fromNumber(Date.parse(key) / DAY_MS);

/**
 * The daily challenge: the same deal for everyone, one attempt per member and day, a streak of
 * consecutive days finished, and a reward paid once per day (`daily:<day>`).
 */
export class DailyService {
  constructor(private services: Services) {}

  /** Records results as daily tables finish. Call once. */
  listen() {
    this.services.events.on('match.finished', (event) => this.record(event));
    return this;
  }

  today(): Day {
    return dayAt(this.services.now(), this.services.config.dailyTimeZone);
  }

  /** Opens today's table, or returns the one already being played. */
  start(player: Player): string {
    const day = this.today();
    const attempt = this.attempt(player.id, day.key);
    if (attempt?.finished === null && this.seated(player.id, attempt.room)) return attempt.room;
    if (attempt)
      throw new ApiError('You have already played today’s challenge.', 'DAILY_DONE', CONFLICT);
    const room = this.services.rooms.openMatch({
      kind: 'daily',
      players: [player],
      bots: DAILY_BOTS,
      seed: dailySeed(day, this.services.config.dailySalt),
    });
    this.services.db
      .prepare('INSERT INTO daily_results (account_id, day, room, started) VALUES (?, ?, ?, ?)')
      .run(player.id, day.key, room, this.services.now());
    return room;
  }

  view(player: Player): DailyView {
    const { db, now, config } = this.services;
    const day = this.today();
    const yesterday = fromNumber(day.number - 1).key;
    return {
      day: day.key,
      nextAt: nextMidnight(now(), config.dailyTimeZone),
      status: this.status(player.id, day.key),
      streak: this.streak(player.id, day),
      ranking: {
        players: finishersOf(db, day.key),
        top: topOf(db, day.key, RANKING_TOP),
        me: lineOf(db, day.key, player.id),
      },
      podium: { day: yesterday, top: topOf(db, yesterday, PODIUM_SIZE) },
    };
  }

  /** Every attempt of a member, for the account export. */
  history(accountId: string) {
    return this.services.db
      .prepare(
        'SELECT day, started, finished, won, score, moves, streak, reward FROM daily_results WHERE account_id = ? ORDER BY day',
      )
      .all(accountId);
  }

  private record(event: MatchFinished) {
    if (event.kind !== 'daily') return;
    const attempt = this.services.db
      .prepare('SELECT * FROM daily_results WHERE room = ? AND finished IS NULL')
      .get(event.room) as Attempt | undefined;
    const seat = attempt ? event.seats.findIndex((s) => s.accountId === attempt.account_id) : -1;
    if (!attempt || seat < 0) return;
    const outcome = event.match.outcome!;
    const won = outcome.winners.includes(seat);
    const result = {
      won,
      score: outcome.scores?.[seat] ?? 0,
      moves: event.match.history.filter((entry) => entry.seat === seat).length,
      reward: DAILY_REWARD + (won ? DAILY_WIN_BONUS : 0),
    };
    this.finish(attempt, { ...result, ended: event.ended });
  }

  private finish(
    attempt: Attempt,
    result: { won: boolean; score: number; moves: number; reward: number; ended: number },
  ) {
    const { db, wallet } = this.services;
    const before = fromNumber(dayOfKey(attempt.day).number - 1).key;
    const previous = this.attempt(attempt.account_id, before);
    const streak = previous?.finished ? (previous.streak ?? 0) + 1 : 1;
    db.transaction(() => {
      db.prepare(
        `UPDATE daily_results SET finished = @ended, won = @won, score = @score, moves = @moves,
           streak = @streak, reward = @reward WHERE account_id = @id AND day = @day`,
      ).run({
        ...result,
        won: result.won ? 1 : 0,
        streak,
        id: attempt.account_id,
        day: attempt.day,
      });
      wallet.credit(attempt.account_id, {
        amount: result.reward,
        reason: 'daily',
        ref: `daily:${attempt.day}`,
      });
    })();
  }

  private status(accountId: string, day: string): DailyStatus {
    const attempt = this.attempt(accountId, day);
    if (!attempt) return { state: 'new' };
    if (attempt.finished === null)
      return this.seated(accountId, attempt.room)
        ? { state: 'playing', room: attempt.room }
        : { state: 'abandoned' };
    const line = lineOf(this.services.db, day, accountId)!;
    return { state: 'finished', result: { ...line, room: attempt.room, reward: attempt.reward! } };
  }

  /**
   * A streak counts consecutive days with a finished challenge. It is still alive while today
   * is not finished yet (yesterday's counts), and back to zero once a whole day is missed.
   */
  private streak(accountId: string, today: Day) {
    const row = this.services.db
      .prepare(
        `SELECT MAX(streak) AS best,
           (SELECT streak FROM daily_results WHERE account_id = @id AND finished IS NOT NULL
             AND day >= @since ORDER BY day DESC LIMIT 1) AS current
         FROM daily_results WHERE account_id = @id`,
      )
      .get({ id: accountId, since: fromNumber(today.number - 1).key }) as {
      best: number | null;
      current: number | null;
    };
    return { current: row.current ?? 0, best: row.best ?? 0 };
  }

  private attempt(accountId: string, day: string) {
    return this.services.db
      .prepare('SELECT * FROM daily_results WHERE account_id = ? AND day = ?')
      .get(accountId, day) as Attempt | undefined;
  }

  /** Still at the table: leaving a daily table closes it, since bots are the only others. */
  private seated(accountId: string, room: string) {
    return this.services.rooms.roomsOf(accountId).some((r) => r.code === room);
  }
}
