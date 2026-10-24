import type { Tally } from './stats';

/**
 * Daily and weekly missions: a counter of `stats.ts` to raise by `goal` within the period.
 * Each period draws a few from its pool, the same for everyone and derived from the date only,
 * so no table stores which missions are on. Ids are permanent and translated by id.
 */
export type MissionPeriod = 'daily' | 'weekly';
export type Mission = {
  id: string;
  period: MissionPeriod;
  stat: string;
  goal: number;
  reward: { xp: number; coins: number };
};
export type Period = { key: string; starts: number; ends: number };

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_DAYS = 7;
/** 1970-01-01 was a Thursday: weeks start on Monday, three days later. */
const MONDAY_OFFSET_DAYS = 3;
export const MISSIONS_PER_PERIOD: Readonly<Record<MissionPeriod, number>> = { daily: 3, weekly: 3 };
const PERIOD_SALT: Readonly<Record<MissionPeriod, number>> = { daily: 1, weekly: 2 };
/** Multiplier and modulus of a small linear congruential generator (Numerical Recipes). */
const LCG_A = 1664525;
const LCG_C = 1013904223;
const UINT32 = 2 ** 32;

const daily = (id: string, stat: string, goal: number, xp: number, coins: number): Mission => ({
  id,
  period: 'daily',
  stat,
  goal,
  reward: { xp, coins },
});
const weekly = (id: string, stat: string, goal: number, xp: number, coins: number): Mission => ({
  ...daily(id, stat, goal, xp, coins),
  period: 'weekly',
});

export const MISSIONS: readonly Mission[] = [
  daily('daily-play-3', 'matches', 3, 60, 30),
  daily('daily-win-1', 'wins', 1, 50, 25),
  daily('daily-win-2', 'wins', 2, 90, 45),
  daily('daily-eights-3', 'log.play.8', 3, 50, 25),
  daily('daily-cards-30', 'log.play', 30, 60, 30),
  daily('daily-challenge-1', 'matches.daily', 1, 70, 35),
  weekly('weekly-play-15', 'matches', 15, 250, 120),
  weekly('weekly-win-7', 'wins', 7, 300, 150),
  weekly('weekly-eights-15', 'log.play.8', 15, 220, 110),
  weekly('weekly-cards-150', 'log.play', 150, 250, 120),
  weekly('weekly-ranked-3', 'matches.ranked', 3, 260, 130),
  weekly('weekly-challenge-4', 'matches.daily', 4, 280, 140),
];

const byId = new Map(MISSIONS.map((mission) => [mission.id, mission]));
export const missionById = (id: string) => byId.get(id);

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The period (UTC day, or UTC week from Monday) containing `now`. */
export function periodOf(period: MissionPeriod, now: number): Period {
  const day = Math.floor(now / DAY_MS);
  const first =
    period === 'daily'
      ? day
      : day - ((((day + MONDAY_OFFSET_DAYS) % WEEK_DAYS) + WEEK_DAYS) % WEEK_DAYS);
  const length = period === 'daily' ? 1 : WEEK_DAYS;
  return { key: isoDay(first * DAY_MS), starts: first * DAY_MS, ends: (first + length) * DAY_MS };
}

/** The missions on for a period kind at `now`: a deterministic draw from its pool. */
export function missionsOf(period: MissionPeriod, now: number): Mission[] {
  const pool = MISSIONS.filter((mission) => mission.period === period);
  let state = (periodOf(period, now).starts / DAY_MS) * PERIOD_SALT[period];
  const next = () => (state = (Math.imul(state, LCG_A) + LCG_C) >>> 0) / UINT32;
  // Fisher–Yates driven by the date: same draw for everyone, no stored state.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j]!, pool[i]!];
  }
  return pool.slice(0, MISSIONS_PER_PERIOD[period]);
}

/** Every mission on at `now`, daily first. */
export const activeMissions = (now: number) => [
  ...missionsOf('daily', now),
  ...missionsOf('weekly', now),
];

/** How far a match moves a mission. */
export const missionGain = (mission: Mission, tally: Tally) => tally[mission.stat] ?? 0;
