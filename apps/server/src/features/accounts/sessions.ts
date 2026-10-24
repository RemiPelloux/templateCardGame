import { createHash, randomBytes } from 'node:crypto';
import type { DeviceSession } from '@cardgame/protocol';
import type { Db } from '../../core/database';

export const SESSION_COOKIE = 'cg_session';
export const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;
const MS_PER_SECOND = 1000;
const TOKEN_BYTES = 32;
const ID_BYTES = 8;
/** Refreshing `seen` on every request would write constantly; once a minute is plenty. */
const SEEN_WRITE_MS = 60_000;

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

type Row = {
  id: string;
  account_id: string;
  device: string;
  created: number;
  seen: number;
  hash: string;
};

/** Sign-in sessions: a random token in an HttpOnly cookie; only its hash is stored. */
export class Sessions {
  constructor(
    private db: Db,
    private now: () => number,
  ) {}

  create(accountId: string, device: string): string {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const id = randomBytes(ID_BYTES).toString('hex');
    const time = this.now();
    this.db
      .prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?, ?)')
      .run(digest(token), id, accountId, device, time, time);
    return token;
  }

  /** The account behind a token, while the session is alive; refreshes its last use. */
  resolve(token: string | undefined): string | null {
    if (!token) return null;
    const row = this.db
      .prepare('SELECT account_id, seen FROM sessions WHERE hash = ? AND seen > ?')
      .get(digest(token), this.now() - SESSION_DAYS * DAY_MS) as
      Pick<Row, 'account_id' | 'seen'> | undefined;
    if (!row) return null;
    if (this.now() - row.seen > SEEN_WRITE_MS)
      this.db.prepare('UPDATE sessions SET seen = ? WHERE hash = ?').run(this.now(), digest(token));
    return row.account_id;
  }

  list(accountId: string, currentToken: string | undefined): DeviceSession[] {
    const rows = this.db
      .prepare('SELECT * FROM sessions WHERE account_id = ? ORDER BY seen DESC')
      .all(accountId) as Row[];
    const current = currentToken ? digest(currentToken) : '';
    return rows.map((r) => ({
      id: r.id,
      device: r.device,
      created: r.created,
      seen: r.seen,
      current: r.hash === current,
    }));
  }

  revoke(token: string | undefined) {
    if (token) this.db.prepare('DELETE FROM sessions WHERE hash = ?').run(digest(token));
  }

  revokeById(accountId: string, id: string) {
    return (
      this.db.prepare('DELETE FROM sessions WHERE account_id = ? AND id = ?').run(accountId, id)
        .changes > 0
    );
  }

  /** Signs out every device but the one making the request (after a password change). */
  revokeOthers(accountId: string, keepToken: string | undefined) {
    this.db
      .prepare('DELETE FROM sessions WHERE account_id = ? AND hash != ?')
      .run(accountId, keepToken ? digest(keepToken) : '');
  }

  sweep() {
    this.db.prepare('DELETE FROM sessions WHERE seen <= ?').run(this.now() - SESSION_DAYS * DAY_MS);
  }
}

export function sessionCookie(
  token: string,
  secure: boolean,
  maxAgeSeconds = (SESSION_DAYS * DAY_MS) / MS_PER_SECOND,
) {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
    ...(secure ? ['Secure'] : []),
  ].join('; ');
}
