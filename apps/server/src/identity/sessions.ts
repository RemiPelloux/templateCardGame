import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { NAME_MAX_LENGTH, type Player } from '@cardgame/protocol';
import { ApiError } from '../http/errors';
import type { Db } from '../storage/database';

export const SESSION_COOKIE = 'cg_session';
export const SESSION_DAYS = 30;
const DAY_MS = 86_400_000;
const MS_PER_SECOND = 1000;
const TOKEN_BYTES = 32;
/** Refreshing `seen` on every request would write constantly; once a minute is plenty. */
const SEEN_WRITE_MS = 60_000;

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

/** Trims and checks a display name; control characters and empty names are refused. */
export function cleanName(input: unknown): string {
  const name = typeof input === 'string' ? input.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
  if (!name || name.length > NAME_MAX_LENGTH || /[\p{Cc}\p{Cf}]/u.test(name))
    throw new ApiError(`Choose a name of 1 to ${NAME_MAX_LENGTH} characters.`, 'INVALID_NAME');
  return name;
}

/**
 * Guest identities: a name and a random token kept in an HttpOnly cookie. Only the token's hash
 * is stored. Swap this for real accounts when the game needs them; nothing else depends on how
 * a Player was authenticated.
 */
export class Sessions {
  constructor(
    private db: Db,
    private now = Date.now,
  ) {}

  create(name: string): { token: string; player: Player } {
    const token = randomBytes(TOKEN_BYTES).toString('base64url');
    const player = { id: randomUUID(), name: cleanName(name) };
    const time = this.now();
    this.db
      .prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?)')
      .run(hash(token), player.id, player.name, time, time);
    return { token, player };
  }

  resolve(token: string | undefined): Player | null {
    if (!token) return null;
    const row = this.db
      .prepare('SELECT player_id, name, seen FROM sessions WHERE hash = ? AND seen > ?')
      .get(hash(token), this.now() - SESSION_DAYS * DAY_MS) as
      { player_id: string; name: string; seen: number } | undefined;
    if (!row) return null;
    if (this.now() - row.seen > SEEN_WRITE_MS)
      this.db.prepare('UPDATE sessions SET seen = ? WHERE hash = ?').run(this.now(), hash(token));
    return { id: row.player_id, name: row.name };
  }

  revoke(token: string | undefined) {
    if (token) this.db.prepare('DELETE FROM sessions WHERE hash = ?').run(hash(token));
  }

  /** Forgets sessions unused for longer than their lifetime. */
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
