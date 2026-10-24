import { DAY_MS } from './missions';

/**
 * Seasons: back-to-back date ranges of `SEASON_DAYS`, numbered from `SEASON_EPOCH`. XP earned
 * during a season also climbs that season's own track, which pays coins at each step and
 * starts again from zero next season.
 */
export const SEASON_EPOCH = Date.UTC(2026, 0, 5);
export const SEASON_DAYS = 56;
export const SEASON_XP_PER_LEVEL = 300;
export const SEASON_MAX_LEVEL = 30;
export const SEASON_LEVEL_COINS = 20;
/** Items on the season track, by season level. */
export const SEASON_ITEMS: Readonly<Record<number, string>> = { 30: 'frame-silver' };

export type Season = { number: number; starts: number; ends: number };
export type SeasonTrack = { level: number; into: number; needed: number | null };
export type SeasonReward = { level: number; coins: number; item?: string };

const SEASON_MS = SEASON_DAYS * DAY_MS;

/** The season containing `now` (season 1 also covers anything before the epoch). */
export function seasonAt(now: number): Season {
  const index = Math.max(0, Math.floor((now - SEASON_EPOCH) / SEASON_MS));
  const starts = SEASON_EPOCH + index * SEASON_MS;
  return { number: index + 1, starts, ends: starts + SEASON_MS };
}

/** Where a season's XP stands on its track (level 0 before the first step). */
export function seasonTrack(xp: number): SeasonTrack {
  const level = Math.min(SEASON_MAX_LEVEL, Math.floor(Math.max(0, xp) / SEASON_XP_PER_LEVEL));
  if (level === SEASON_MAX_LEVEL) return { level, into: 0, needed: null };
  return { level, into: xp - level * SEASON_XP_PER_LEVEL, needed: SEASON_XP_PER_LEVEL };
}

/** Rewards for every season step crossed between two amounts of season XP. */
export function seasonLevelUps(fromXp: number, toXp: number): SeasonReward[] {
  const from = seasonTrack(fromXp).level;
  const to = seasonTrack(toXp).level;
  return Array.from({ length: Math.max(0, to - from) }, (_, i) => {
    const level = from + i + 1;
    const item = SEASON_ITEMS[level];
    return { level, coins: SEASON_LEVEL_COINS, ...(item ? { item } : {}) };
  });
}
