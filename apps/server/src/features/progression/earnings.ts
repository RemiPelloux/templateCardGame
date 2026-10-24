import {
  LEVEL_STAT,
  levelFor,
  levelUps,
  newlyReached,
  seasonAt,
  seasonLevelUps,
  seasonTrack,
} from '@cardgame/meta';
import type { Services } from '../../core/feature';
import type { ProgressStore } from './store';

/** One member's gains being settled inside a transaction: what was credited, for the summary. */
export type Settlement = {
  services: Services;
  store: ProgressStore;
  accountId: string;
  coins: number;
  items: string[];
};
type Payment = { coins: number; reason: string; ref: string; item?: string };
export type Climb = { before: number; after: number };

export const settlement = (services: Services, store: ProgressStore, accountId: string) => ({
  services,
  store,
  accountId,
  coins: 0,
  items: [] as string[],
});

/** Credits coins (once per `ref`) and grants an item; counts only what was actually new. */
export function pay(s: Settlement, payment: Payment) {
  const { wallet, inventory } = s.services;
  const movement = { amount: payment.coins, reason: payment.reason, ref: payment.ref };
  if (payment.coins > 0 && wallet.credit(s.accountId, movement)) s.coins += payment.coins;
  if (payment.item && inventory.grant(s.accountId, payment.item, 'reward'))
    s.items.push(payment.item);
}

function climbLevels(s: Settlement, amount: number): Climb {
  const before = s.store.xp(s.accountId);
  s.store.addXp(s.accountId, amount);
  for (const reward of levelUps(before, before + amount))
    pay(s, { ...reward, reason: 'reward.level', ref: `level:${reward.level}` });
  const after = levelFor(before + amount).level;
  s.store.addStats(s.accountId, { [LEVEL_STAT]: after }, [LEVEL_STAT]);
  return { before: levelFor(before).level, after };
}

function climbSeason(s: Settlement, amount: number, at: number): Climb {
  const season = seasonAt(at).number;
  const before = s.store.seasonXp(s.accountId, season);
  s.store.addSeasonXp(s.accountId, season, amount);
  for (const reward of seasonLevelUps(before, before + amount))
    pay(s, { ...reward, reason: 'reward.season', ref: `season:${season}:${reward.level}` });
  return { before: seasonTrack(before).level, after: seasonTrack(before + amount).level };
}

/** Adds XP to the level curve and to the season of `at`, paying every step crossed. */
export function gainXp(s: Settlement, amount: number, at: number) {
  return { level: climbLevels(s, amount), season: climbSeason(s, amount, at) };
}

/** Unlocks every achievement the counters now satisfy and pays each one once. */
export function unlockAchievements(s: Settlement, at: number): string[] {
  const unlocked = new Set(s.store.unlocked(s.accountId).keys());
  return newlyReached(s.store.stats(s.accountId), unlocked).map((achievement) => {
    s.store.unlock(s.accountId, achievement.id, at);
    pay(s, {
      ...achievement.reward,
      reason: 'reward.achievement',
      ref: `achievement:${achievement.id}`,
    });
    return achievement.id;
  });
}
