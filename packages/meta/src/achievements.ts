import type { Tally } from './stats';

/**
 * Permanent trophies: a lifetime counter (`stats.ts`, or `level`) reaching `goal` unlocks one,
 * once, with a one-time reward. Ids are permanent and translated by id.
 */
export type Achievement = {
  id: string;
  stat: string;
  goal: number;
  reward: { coins: number; item?: string };
};

const trophy = (id: string, stat: string, goal: number, coins: number, item?: string) => ({
  id,
  stat,
  goal,
  reward: item ? { coins, item } : { coins },
});

export const ACHIEVEMENTS: readonly Achievement[] = [
  trophy('first-match', 'matches', 1, 25),
  trophy('first-win', 'wins', 1, 50),
  trophy('matches-50', 'matches', 50, 150),
  trophy('matches-250', 'matches', 250, 400),
  trophy('wins-10', 'wins', 10, 100),
  trophy('wins-50', 'wins', 50, 250, 'frame-silver'),
  trophy('wins-200', 'wins', 200, 600, 'frame-gold'),
  trophy('eights-25', 'log.play.8', 25, 100),
  trophy('eights-250', 'log.play.8', 250, 400),
  trophy('daily-7', 'matches.daily', 7, 150),
  trophy('ranked-wins-10', 'wins.ranked', 10, 250),
  trophy('level-10', 'level', 10, 150),
  trophy('level-25', 'level', 25, 400),
];

const byId = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement]));
export const achievementById = (id: string) => byId.get(id);

/** Progress toward an achievement, capped at its goal. */
export const achievementProgress = (achievement: Achievement, stats: Tally) =>
  Math.min(achievement.goal, stats[achievement.stat] ?? 0);

/** Achievements the statistics satisfy, among those not unlocked yet. */
export const newlyReached = (stats: Tally, unlocked: ReadonlySet<string>) =>
  ACHIEVEMENTS.filter(
    (achievement) =>
      !unlocked.has(achievement.id) && (stats[achievement.stat] ?? 0) >= achievement.goal,
  );
