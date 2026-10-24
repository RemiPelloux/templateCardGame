import type { Migration } from '../../core/database';

const MEMBER = 'TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE';

/**
 * Friendships are stored once per direction, so "my friends" is one indexed lookup. Every member
 * table cascades on account deletion. Reports outlive their accounts for moderation: the deleted
 * side becomes NULL (`ON DELETE SET NULL`), which pseudonymises it, while the report stays.
 */
export const socialMigrations: Migration[] = [
  {
    id: 'social.1-tables',
    up: `CREATE TABLE friendships (account_id ${MEMBER}, friend_id ${MEMBER},
           since INTEGER NOT NULL, PRIMARY KEY (account_id, friend_id));
         CREATE INDEX friendships_friend ON friendships(friend_id);
         CREATE TABLE friend_requests (from_id ${MEMBER}, to_id ${MEMBER},
           created INTEGER NOT NULL, PRIMARY KEY (from_id, to_id));
         CREATE INDEX friend_requests_to ON friend_requests(to_id);
         CREATE TABLE blocks (blocker_id ${MEMBER}, blocked_id ${MEMBER},
           created INTEGER NOT NULL, PRIMARY KEY (blocker_id, blocked_id));
         CREATE INDEX blocks_blocked ON blocks(blocked_id);
         CREATE TABLE presence (account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
           last_seen INTEGER NOT NULL DEFAULT 0, appear_offline INTEGER NOT NULL DEFAULT 0);
         CREATE TABLE table_invites (id INTEGER PRIMARY KEY, from_id ${MEMBER}, to_id ${MEMBER},
           room TEXT NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL,
           UNIQUE (from_id, to_id, room));
         CREATE INDEX table_invites_to ON table_invites(to_id, expires);
         CREATE TABLE reports (id INTEGER PRIMARY KEY,
           reporter_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
           target_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
           reason TEXT NOT NULL, note TEXT, room TEXT, day INTEGER NOT NULL,
           created INTEGER NOT NULL, UNIQUE (reporter_id, target_id, reason, day));
         CREATE INDEX reports_created ON reports(created);`,
  },
];
