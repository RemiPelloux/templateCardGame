import { beforeEach, describe, expect, it } from 'vitest';
import type { Player } from '@cardgame/protocol';
import type { MatchFinished } from '../src/core/events';
import type { Services } from '../src/core/feature';
import { dailySeed, dayAt, nextMidnight } from '../src/features/daily/calendar';
import { DAILY_REWARD, DAILY_WIN_BONUS, DailyService } from '../src/features/daily/daily-service';
import { BOT_DELAY_MS } from '../src/features/rooms/model';
import { PASSWORD, signUp, testServices } from './support';

const PARIS = 'Europe/Paris';
/** Saturday 24 October 2026, 10:00 in Paris (UTC+2 until the next night). */
const SATURDAY_10H = Date.UTC(2026, 9, 24, 8);
const DAY = 24 * 60 * 60 * 1000;
const MAX_STEPS = 2000;

let services: Services;
let clock: { now: number };
let daily: DailyService;
let ada: Player;

beforeEach(async () => {
  ({ services, clock } = testServices());
  clock.now = SATURDAY_10H;
  daily = new DailyService(services).listen();
  ada = await signUp(services, 'ada');
});

/** Plays a table to its end: the member plays their first legal move, bots move on ticks. */
function playOut(code: string, player: Player) {
  for (let i = 0; i < MAX_STEPS && services.rooms.view(code, player).status === 'playing'; i++) {
    clock.now += BOT_DELAY_MS;
    services.rooms.tick();
    const view = services.rooms.view(code, player);
    const command = view.match?.legal[0];
    if (command) services.rooms.play(code, player, { revision: view.revision, command });
  }
  expect(services.rooms.view(code, player).status).toBe('finished');
}

describe('daily calendar', () => {
  it('turns the day at midnight in the time zone, not in UTC', () => {
    expect(dayAt(Date.UTC(2026, 9, 24, 21, 59), PARIS).key).toBe('2026-10-24');
    expect(dayAt(Date.UTC(2026, 9, 24, 22, 1), PARIS).key).toBe('2026-10-25');
    expect(dayAt(Date.UTC(2026, 9, 24, 22, 1), 'UTC').key).toBe('2026-10-24');
  });

  it('finds the next midnight, across a daylight-saving change', () => {
    expect(nextMidnight(SATURDAY_10H, PARIS)).toBe(Date.UTC(2026, 9, 24, 22));
    // Sunday 25 October lasts 25 hours in Paris: the clocks go back at 03:00.
    expect(nextMidnight(Date.UTC(2026, 9, 25, 10), PARIS)).toBe(Date.UTC(2026, 9, 25, 23));
  });

  it('derives a secret seed per day', () => {
    const today = dayAt(SATURDAY_10H, PARIS);
    const tomorrow = dayAt(SATURDAY_10H + DAY, PARIS);
    expect(dailySeed(today, 'salt-a')).toBe(dailySeed(today, 'salt-a'));
    expect(dailySeed(today, 'salt-a')).not.toBe(dailySeed(tomorrow, 'salt-a'));
    expect(dailySeed(today, 'salt-a')).not.toBe(dailySeed(today, 'salt-b'));
  });
});

describe('daily challenge', () => {
  it('deals the same hand to everyone on the same day', async () => {
    const bob = await signUp(services, 'bob');
    const mine = services.rooms.view(daily.start(ada), ada).match!.state.hand;
    expect(services.rooms.view(daily.start(bob), bob).match!.state.hand).toEqual(mine);
  });

  it('allows one attempt a day, resuming it until it ends', () => {
    const code = daily.start(ada);
    expect(daily.start(ada)).toBe(code);
    expect(daily.view(ada).status).toEqual({ state: 'playing', room: code });
    playOut(code, ada);
    expect(daily.view(ada).status.state).toBe('finished');
    expect(() => daily.start(ada)).toThrow(/already played/);
    clock.now = nextMidnight(clock.now, PARIS);
    expect(daily.view(ada).status).toEqual({ state: 'new' });
    expect(daily.start(ada)).not.toBe(code);
  });

  it('uses up the attempt when the member leaves the table', () => {
    services.rooms.leave(daily.start(ada), ada);
    expect(daily.view(ada).status).toEqual({ state: 'abandoned' });
    expect(() => daily.start(ada)).toThrow(/already played/);
  });

  it('forgets a member’s attempts when the account is deleted', async () => {
    daily.start(ada);
    await services.accounts.delete(ada.id, PASSWORD);
    expect(services.db.prepare('SELECT COUNT(*) AS n FROM daily_results').get()).toEqual({ n: 0 });
  });

  it('records the result and pays the reward once', () => {
    const code = daily.start(ada);
    const finished: MatchFinished[] = [];
    services.events.on('match.finished', (event) => finished.push(event));
    playOut(code, ada);
    services.events.emit('match.finished', finished[0]!);
    const status = daily.view(ada).status;
    if (status.state !== 'finished') throw new Error('not finished');
    const reward = DAILY_REWARD + (status.result.won ? DAILY_WIN_BONUS : 0);
    expect(status.result).toMatchObject({ rank: 1, room: code, reward });
    expect(status.result.moves).toBeGreaterThan(0);
    expect(services.wallet.balance(ada.id)).toBe(reward);
  });

  it('counts consecutive days finished as a streak', () => {
    const playDay = () => playOut(daily.start(ada), ada);
    playDay();
    expect(daily.view(ada).streak).toEqual({ current: 1, best: 1 });
    clock.now += DAY;
    expect(daily.view(ada).streak.current).toBe(1);
    playDay();
    expect(daily.view(ada).streak).toEqual({ current: 2, best: 2 });
    clock.now += 2 * DAY;
    expect(daily.view(ada).streak).toEqual({ current: 0, best: 2 });
    playDay();
    expect(daily.view(ada).streak).toEqual({ current: 1, best: 2 });
  });
});

describe('daily ranking', () => {
  type Line = { name: string; won: boolean; score: number; moves: number; finished: number };
  async function seed(day: string, lines: Line[]) {
    for (const line of lines) {
      const player = await signUp(services, line.name);
      services.db
        .prepare('INSERT INTO daily_results VALUES (?, ?, ?, 0, ?, ?, ?, ?, 1, ?)')
        .run(player.id, day, 'ROOMS', line.finished, line.won ? 1 : 0, line.score, line.moves, 0);
    }
  }

  it('ranks winners, then score, then fewer moves, then the earliest finish', async () => {
    await seed('2026-10-24', [
      { name: 'loser_high', won: false, score: 90, moves: 5, finished: 1 },
      { name: 'win_low', won: true, score: 10, moves: 5, finished: 1 },
      { name: 'win_slow', won: true, score: 50, moves: 9, finished: 1 },
      { name: 'win_late', won: true, score: 50, moves: 7, finished: 3 },
      { name: 'win_early', won: true, score: 50, moves: 7, finished: 2 },
    ]);
    const view = daily.view(ada);
    expect(view.ranking.players).toBe(5);
    expect(view.ranking.top.map((r) => r.name)).toEqual([
      'win_early',
      'win_late',
      'win_slow',
      'win_low',
      'loser_high',
    ]);
    expect(view.ranking.me).toBeNull();
  });

  it('shows yesterday’s podium', async () => {
    await seed('2026-10-23', [
      { name: 'first', won: true, score: 40, moves: 3, finished: 1 },
      { name: 'second', won: true, score: 30, moves: 3, finished: 1 },
      { name: 'third', won: false, score: 0, moves: 3, finished: 1 },
      { name: 'fourth', won: false, score: 0, moves: 4, finished: 1 },
    ]);
    const podium = daily.view(ada).podium;
    expect(podium.day).toBe('2026-10-23');
    expect(podium.top.map((r) => [r.rank, r.name])).toEqual([
      [1, 'first'],
      [2, 'second'],
      [3, 'third'],
    ]);
  });
});
