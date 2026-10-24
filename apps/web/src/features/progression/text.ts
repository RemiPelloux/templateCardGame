import type { Translate } from '@cardgame/i18n';
import type { AppMessages } from '../../i18n/messages';

type T = Translate<AppMessages>;
type Key = Parameters<T>[0];

/** Missions and achievements are translated by id: their keys are built at run time. */
export const missionText = (t: T, id: string, goal: number) =>
  t(`progression.missions.ids.${id}` as Key, { count: goal });

export const achievementName = (t: T, id: string) =>
  t(`progression.achievements.ids.${id}.name` as Key);

export const achievementText = (t: T, id: string) =>
  t(`progression.achievements.ids.${id}.text` as Key);
