import { normalizeRoomCode, type Player, type TableInviteView } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { ApiError } from '../../core/http/errors';
import { INVITE_TTL_MS, INVITES_PER_MINUTE } from './limits';
import { memberByHandle, publicOf, spend } from './people';
import type { SocialStore } from './store';

const FORBIDDEN = 403;
const CONFLICT = 409;

type Row = { id: number; from_id: string; room: string; created: number; expires: number };
type InviteInput = { me: Player; handle: unknown; room: unknown };

/**
 * Table invites: a friend seated at a casual table asks another friend to come. Accepting is
 * just opening the table; the web then joins through the rooms endpoints, which apply their own
 * rules (full, already dealt). Invites vanish after `INVITE_TTL_MS` or once the inviter leaves.
 */
export class Invites {
  constructor(
    private services: Services,
    private store: SocialStore,
  ) {}

  send(input: InviteInput) {
    spend(this.services, { key: `invite:${input.me.id}`, perMinute: INVITES_PER_MINUTE });
    const room = normalizeRoomCode(typeof input.room === 'string' ? input.room : '');
    const other = memberByHandle(this.services, input);
    if (!this.store.areFriends({ a: input.me.id, b: other.id }))
      throw new ApiError('You can only invite friends.', 'NOT_FRIENDS', FORBIDDEN);
    const table = this.services.rooms.roomsOf(input.me.id).find((r) => r.code === room);
    if (!table) throw new ApiError('You are not seated at this table.', 'NOT_AT_TABLE', FORBIDDEN);
    if (table.kind !== 'casual')
      throw new ApiError('This table takes no guests.', 'CANNOT_INVITE', FORBIDDEN);
    if (this.seated(other.id, room))
      throw new ApiError('They are already at this table.', 'ALREADY_AT_TABLE', CONFLICT);
    const now = this.services.now();
    this.services.db
      .prepare(
        `INSERT INTO table_invites (from_id, to_id, room, created, expires) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(from_id, to_id, room)
           DO UPDATE SET created = excluded.created, expires = excluded.expires`,
      )
      .run(input.me.id, other.id, room, now, now + INVITE_TTL_MS);
  }

  /** The invites still worth answering: not expired, the inviter still there, us not yet. */
  received(id: string): TableInviteView[] {
    const rows = this.services.db
      .prepare(
        `SELECT id, from_id, room, created, expires FROM table_invites
           WHERE to_id = ? AND expires > ? ORDER BY created DESC`,
      )
      .all(id, this.services.now()) as Row[];
    return rows.flatMap((row) => {
      const from = this.services.accounts.player(row.from_id);
      if (!from || !this.seated(row.from_id, row.room) || this.seated(id, row.room)) return [];
      const { room, created, expires } = row;
      return [{ id: row.id, from: publicOf(from), room, created, expires }];
    });
  }

  dismiss(id: string, inviteId: unknown) {
    this.services.db
      .prepare('DELETE FROM table_invites WHERE id = ? AND to_id = ?')
      .run(Number(inviteId), id);
  }

  sweep() {
    this.services.db
      .prepare('DELETE FROM table_invites WHERE expires <= ?')
      .run(this.services.now());
  }

  private seated(id: string, room: string) {
    return this.services.rooms.roomsOf(id).some((r) => r.code === room);
  }
}
