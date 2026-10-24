import type { Feature } from '../../core/feature';
import { every } from '../../core/schedule';
import { accountRoutes } from './routes';

const SWEEP_MS = 60 * 60 * 1000;

/** Accounts: sign-up, sign-in, recovery codes, device sessions, settings and deletion. */
export const accountsFeature: Feature = {
  name: 'accounts',
  migrations: [
    {
      id: 'accounts.1-tables',
      up: `CREATE TABLE accounts (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE,
             tag INTEGER NOT NULL, password TEXT NOT NULL, locale TEXT, created INTEGER NOT NULL);
           CREATE TABLE sessions (hash TEXT PRIMARY KEY, id TEXT NOT NULL UNIQUE,
             account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
             device TEXT NOT NULL, created INTEGER NOT NULL, seen INTEGER NOT NULL);
           CREATE INDEX sessions_account ON sessions(account_id);
           CREATE INDEX sessions_seen ON sessions(seen);
           CREATE TABLE recovery_codes (account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
             selector TEXT NOT NULL, hash TEXT NOT NULL, created INTEGER NOT NULL);
           CREATE INDEX recovery_codes_account ON recovery_codes(account_id, selector);`,
    },
  ],
  routes: accountRoutes,
  tick: every(SWEEP_MS, ({ accounts }) => accounts.sessions.sweep()),
  exportData: (accountId, { accounts }) => ({ account: accounts.player(accountId) }),
};
