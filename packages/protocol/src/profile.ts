import type { AchievementView, LevelView } from './progression';
import type { RoomKind } from './rooms';

export type KindStats = { matches: number; wins: number };

export type MatchLine = {
  room: string;
  kind: RoomKind;
  won: boolean;
  score: number;
  players: number;
  xp: number;
  ended: number;
};

/** A member's public page: who they are, what they wear, how they play. */
export type ProfileView = {
  name: string;
  tag: number;
  /** `name#tag`. */
  handle: string;
  /** What each cosmetic slot shows (`frame` rings the avatar). */
  equipped: Record<string, string>;
  level: LevelView;
  stats: KindStats & { byKind: Partial<Record<RoomKind, KindStats>> };
  achievements: AchievementView[];
  recent: MatchLine[];
};

export const profileApi = {
  mine: '/api/profile',
  /** A handle travels as `name-1234` in paths, like the web's profile route. */
  of: (handle: string) => `/api/profile/${handle.replace('#', '-')}`,
} as const;
