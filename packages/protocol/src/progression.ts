import type { RoomKind } from './rooms';

/** Where a member stands on the level curve: XP `into` the level, out of `needed` (null at max). */
export type LevelView = { level: number; total: number; into: number; needed: number | null };

export type MissionView = {
  id: string;
  period: 'daily' | 'weekly';
  goal: number;
  progress: number;
  claimed: boolean;
  reward: { xp: number; coins: number };
  /** When the mission's period ends (ms since epoch). */
  ends: number;
};

export type AchievementView = {
  id: string;
  goal: number;
  progress: number;
  /** When it was unlocked, or null. */
  unlocked: number | null;
  reward: { coins: number; item?: string };
};

export type SeasonView = {
  number: number;
  starts: number;
  ends: number;
  level: number;
  into: number;
  needed: number | null;
};

export type ProgressionView = {
  level: LevelView;
  missions: MissionView[];
  achievements: AchievementView[];
  season: SeasonView;
};

/** What one finished match earned a member, shown under the result. */
export type ResultSummary = {
  room: string;
  kind: RoomKind;
  won: boolean;
  xp: number;
  /** Every coin credited for this match: the match, level-ups, season steps, trophies. */
  coins: number;
  level: { before: number; after: number };
  season: { before: number; after: number };
  missions: { id: string; progress: number; goal: number; completed: boolean }[];
  achievements: string[];
  items: string[];
  ended: number;
};

export type ClaimResponse = { progression: ProgressionView; coins: number; xp: number };

export const progressionApi = {
  progression: '/api/progression',
  claim: (id: string) => `/api/progression/missions/${id}/claim`,
  /** The member's last result at a table; 404 until a match there has ended. */
  result: (room: string) => `/api/progression/result/${room}`,
} as const;
