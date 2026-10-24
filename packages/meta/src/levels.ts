/**
 * Levels: experience (XP) climbs a gentle curve to `MAX_LEVEL`, and each level reached pays a
 * reward. Pure numbers, shared by the server (which grants) and the client (which shows bars).
 */
export const MAX_LEVEL = 50;
/** XP from level 1 to level 2; each next level asks `XP_STEP` more. */
export const XP_FIRST_LEVEL = 100;
export const XP_STEP = 25;
/** Coins for reaching level n: `LEVEL_COINS_BASE + n * LEVEL_COINS_PER_LEVEL`. */
export const LEVEL_COINS_BASE = 50;
export const LEVEL_COINS_PER_LEVEL = 10;

/** Items handed out on reaching a level, by level. Ids come from the catalog (`items.ts`). */
export const LEVEL_ITEMS: Readonly<Record<number, string>> = {
  10: 'felt-midnight',
  25: 'back-royal',
  50: 'back-gold',
};

export type LevelReward = { level: number; coins: number; item?: string };
/** Where a total of XP stands: `into` the current level, out of `needed` (null at the top). */
export type LevelState = { level: number; total: number; into: number; needed: number | null };

/** XP needed to go from `level` to the next one. */
export const xpToNext = (level: number) => XP_FIRST_LEVEL + XP_STEP * (level - 1);

/** Total XP at which `level` is reached (level 1 is 0). */
export function xpForLevel(level: number): number {
  let total = 0;
  for (let l = 1; l < Math.min(level, MAX_LEVEL); l++) total += xpToNext(l);
  return total;
}

/** The level a total of XP gives, with progress toward the next one. */
export function levelFor(totalXp: number): LevelState {
  const total = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (level < MAX_LEVEL && total >= xpForLevel(level + 1)) level++;
  const into = total - xpForLevel(level);
  return { level, total, into, needed: level < MAX_LEVEL ? xpToNext(level) : null };
}

export function levelReward(level: number): LevelReward {
  const item = LEVEL_ITEMS[level];
  return {
    level,
    coins: LEVEL_COINS_BASE + level * LEVEL_COINS_PER_LEVEL,
    ...(item ? { item } : {}),
  };
}

/** Rewards for every level crossed going from one XP total to another. */
export function levelUps(fromXp: number, toXp: number): LevelReward[] {
  const from = levelFor(fromXp).level;
  const to = levelFor(toXp).level;
  return Array.from({ length: Math.max(0, to - from) }, (_, i) => levelReward(from + i + 1));
}
