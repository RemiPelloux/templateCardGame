import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS,
  activeMissions,
  DAY_MS,
  isItemId,
  LEVEL_ITEMS,
  levelFor,
  levelUps,
  MAX_LEVEL,
  matchReward,
  MISSIONS,
  MISSIONS_PER_PERIOD,
  newlyReached,
  periodOf,
  SEASON_DAYS,
  SEASON_EPOCH,
  SEASON_ITEMS,
  seasonAt,
  seasonLevelUps,
  seasonTrack,
  tallyMatch,
  xpForLevel,
} from '../src';

const SATURDAY = Date.UTC(2026, 9, 24, 15);

describe('levels', () => {
  it('climbs a growing curve and stops at the top', () => {
    expect(levelFor(0)).toEqual({ level: 1, total: 0, into: 0, needed: 100 });
    expect(levelFor(99).level).toBe(1);
    expect(levelFor(100)).toMatchObject({ level: 2, into: 0, needed: 125 });
    expect(levelFor(xpForLevel(MAX_LEVEL) + 10_000)).toMatchObject({
      level: MAX_LEVEL,
      needed: null,
    });
  });

  it('pays every level crossed, with catalog items', () => {
    const rewards = levelUps(0, xpForLevel(11));
    expect(rewards.map((r) => r.level)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(rewards.find((r) => r.level === 10)?.item).toBe('felt-midnight');
    expect(levelUps(500, 500)).toEqual([]);
    for (const item of Object.values(LEVEL_ITEMS)) expect(isItemId(item)).toBe(true);
  });
});

describe('match rewards', () => {
  it('pays more for wins, special tables and people', () => {
    const base = { kind: 'casual', won: false, players: 2, humans: 2 };
    expect(matchReward(base)).toEqual({ xp: 20, coins: 5 });
    expect(matchReward({ ...base, won: true })).toEqual({ xp: 50, coins: 20 });
    expect(matchReward({ ...base, kind: 'ranked' }).xp).toBe(40);
    expect(matchReward({ ...base, humans: 1 }).xp).toBe(10);
    expect(matchReward({ ...base, players: 4 }).xp).toBe(30);
  });
});

describe('tally', () => {
  it('counts results and the seat’s own log events, by card rank', () => {
    const log = [
      { seq: 3, seat: 0, event: 'play', data: { card: { id: '8H', rank: '8' } } },
      { seq: 2, seat: 1, event: 'play', data: { card: { id: '8S', rank: '8' } } },
      { seq: 1, seat: 0, event: 'draw', data: { count: 1 } },
    ];
    expect(tallyMatch({ kind: 'daily', won: true, seat: 0, log })).toEqual({
      matches: 1,
      'matches.daily': 1,
      wins: 1,
      'wins.daily': 1,
      'log.play': 1,
      'log.play.8': 1,
      'log.draw': 1,
    });
  });
});

describe('missions', () => {
  it('has unique ids and a pool larger than each draw', () => {
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length);
    for (const period of ['daily', 'weekly'] as const)
      expect(MISSIONS.filter((m) => m.period === period).length).toBeGreaterThan(
        MISSIONS_PER_PERIOD[period],
      );
  });

  it('draws the same missions all day and rotates the next day', () => {
    const today = activeMissions(SATURDAY).map((m) => m.id);
    expect(activeMissions(SATURDAY + 1000).map((m) => m.id)).toEqual(today);
    expect(today).toHaveLength(MISSIONS_PER_PERIOD.daily + MISSIONS_PER_PERIOD.weekly);
    const days = Array.from({ length: 7 }, (_, i) =>
      activeMissions(SATURDAY + i * DAY_MS)
        .filter((m) => m.period === 'daily')
        .map((m) => m.id)
        .join(),
    );
    expect(new Set(days).size).toBeGreaterThan(1);
  });

  it('cuts days at midnight UTC and weeks on Monday', () => {
    expect(periodOf('daily', SATURDAY)).toMatchObject({ key: '2026-10-24' });
    const week = periodOf('weekly', SATURDAY);
    expect(week.key).toBe('2026-10-19');
    expect(week.ends - week.starts).toBe(7 * DAY_MS);
    expect(periodOf('weekly', week.ends).key).toBe('2026-10-26');
  });
});

describe('achievements', () => {
  it('unlocks each trophy once its counter reaches the goal', () => {
    for (const a of ACHIEVEMENTS) if (a.reward.item) expect(isItemId(a.reward.item)).toBe(true);
    const ids = newlyReached({ matches: 1, wins: 1 }, new Set(['first-match'])).map((a) => a.id);
    expect(ids).toEqual(['first-win']);
  });
});

describe('seasons', () => {
  it('numbers back-to-back ranges from the epoch', () => {
    expect(seasonAt(SEASON_EPOCH - DAY_MS).number).toBe(1);
    const second = seasonAt(SEASON_EPOCH + SEASON_DAYS * DAY_MS);
    expect(second.number).toBe(2);
    expect(second.ends - second.starts).toBe(SEASON_DAYS * DAY_MS);
  });

  it('climbs its own track and pays each step', () => {
    expect(seasonTrack(0)).toEqual({ level: 0, into: 0, needed: 300 });
    expect(seasonTrack(650)).toEqual({ level: 2, into: 50, needed: 300 });
    expect(seasonLevelUps(250, 650).map((r) => r.level)).toEqual([1, 2]);
    for (const item of Object.values(SEASON_ITEMS)) expect(isItemId(item)).toBe(true);
  });
});
