import type { Locale } from '@cardgame/i18n';

/** A signed-in member as other code sees them. `tag` makes `name#tag` unique and shareable. */
export type Player = { id: string; name: string; tag: number };

export type RegisterRequest = { username: string; password: string };
export type LoginRequest = { username: string; password: string };
export type RecoverRequest = { username: string; code: string; password: string };
export type ChangePasswordRequest = { current: string; next: string };
export type ConfirmRequest = { password: string };
export type LocaleRequest = { locale: Locale };

export type SessionResponse = { player: Player; locale: Locale | null };
/** Registration and regeneration hand the recovery codes out once, in clear. */
export type RecoveryCodesResponse = { codes: string[] };
export type RegisterResponse = SessionResponse & RecoveryCodesResponse;

export type DeviceSession = {
  id: string;
  device: string;
  created: number;
  seen: number;
  current: boolean;
};
export type AccountOverview = {
  player: Player;
  created: number;
  recovery: { remaining: number; total: number };
  sessions: DeviceSession[];
};

export const accountApi = {
  session: '/api/session',
  register: '/api/auth/register',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  recover: '/api/auth/recover',
  availability: (username: string) => `/api/auth/available/${encodeURIComponent(username)}`,
  account: '/api/account',
  deleteAccount: '/api/account/delete',
  password: '/api/account/password',
  locale: '/api/account/locale',
  recoveryCodes: '/api/account/recovery-codes',
  deviceSession: (id: string) => `/api/account/sessions/${id}`,
  export: '/api/account/export',
} as const;
