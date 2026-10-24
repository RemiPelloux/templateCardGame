import {
  ACHIEVEMENTS,
  achievementProgress,
  activeMissions,
  LEVEL_STAT,
  levelFor,
  periodOf,
  seasonAt,
  seasonTrack,
} from '@cardgame/meta';
import type { AchievementView, MissionView, ProgressionView } from '@cardgame/protocol';
import type { ProgressStore } from './store';

function missionViews(store: ProgressStore, accountId: string, now: number): MissionView[] {
  const missions = activeMissions(now);
  const periods = missions.map((m) => periodOf(m.period, now));
  const rows = store.missions(accountId, [...new Set(periods.map((p) => p.key))]);
  return missions.map((mission, i) => {
    const period = periods[i]!;
    const row = rows.find((r) => r.mission_id === mission.id && r.period === period.key);
    return {
      ...{ id: mission.id, period: mission.period, goal: mission.goal, reward: mission.reward },
      ...{ progress: row?.progress ?? 0, claimed: !!row?.claimed, ends: period.ends },
    };
  });
}

function achievementViews(store: ProgressStore, accountId: string): AchievementView[] {
  const stats = { ...store.stats(accountId), [LEVEL_STAT]: levelFor(store.xp(accountId)).level };
  const unlocked = store.unlocked(accountId);
  return ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    goal: achievement.goal,
    progress: achievementProgress(achievement, stats),
    unlocked: unlocked.get(achievement.id) ?? null,
    reward: achievement.reward,
  }));
}

/** Everything the progress screens show for one member at `now`. */
export function progressionView(
  store: ProgressStore,
  input: { accountId: string; now: number },
): ProgressionView {
  const season = seasonAt(input.now);
  return {
    level: levelFor(store.xp(input.accountId)),
    missions: missionViews(store, input.accountId, input.now),
    achievements: achievementViews(store, input.accountId),
    season: { ...season, ...seasonTrack(store.seasonXp(input.accountId, season.number)) },
  };
}
