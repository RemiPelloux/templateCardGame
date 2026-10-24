/**
 * Wire types and endpoints of the social feature: friends, presence, table invites, blocks and
 * reports. Other members always travel as a public handle (`name#tag`), never as an account id.
 */

/** Another member, as the social screens show them. `name#tag` is their handle. */
export type SocialPlayer = { name: string; tag: number };

/** What a friend can see: never which table, only that one is being played. */
export type Presence = 'online' | 'playing' | 'offline';

export type FriendView = SocialPlayer & { presence: Presence; since: number };
export type FriendRequestView = SocialPlayer & { created: number };

export type TableInviteView = {
  id: number;
  from: SocialPlayer;
  room: string;
  created: number;
  expires: number;
};

export type SocialSettings = { appearOffline: boolean };

/** Everything the friends screen shows, in one answer; every social write returns it too. */
export type SocialOverview = {
  friends: FriendView[];
  incoming: FriendRequestView[];
  outgoing: FriendRequestView[];
  blocked: SocialPlayer[];
  invites: TableInviteView[];
  settings: SocialSettings;
};

/** The answer to the presence ping: what the navigation badge counts. */
export type SocialPulse = { requests: number; invites: number };

export const REPORT_REASONS = [
  'cheating',
  'harassment',
  'offensive-name',
  'spam',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_NOTE_MAX_LENGTH = 280;

export type HandleRequest = { handle: string };
export type InviteRequest = { handle: string; room: string };
export type DismissInviteRequest = { id: number };
export type ReportRequest = { handle: string; reason: ReportReason; note?: string; room?: string };

/** `ada#1234`: how a member is written, typed and shared. */
export const handleOf = (player: SocialPlayer) => `${player.name}#${player.tag}`;

export const socialApi = {
  overview: '/api/social',
  presence: '/api/social/presence',
  settings: '/api/social/settings',
  request: '/api/social/requests',
  accept: '/api/social/requests/accept',
  decline: '/api/social/requests/decline',
  cancel: '/api/social/requests/cancel',
  remove: '/api/social/friends/remove',
  block: '/api/social/blocks',
  unblock: '/api/social/blocks/remove',
  invite: '/api/social/invites',
  dismissInvite: '/api/social/invites/dismiss',
  report: '/api/social/reports',
} as const;
