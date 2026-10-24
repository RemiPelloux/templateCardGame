import type { Presence, SocialSettings } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { ONLINE_WINDOW_MS } from './limits';

type Row = { last_seen: number; appear_offline: number };

/**
 * Who is around, from the app's own ping (`POST /api/social/presence`, every 30 s while a page
 * is open) rather than from every request: one small write per member per ping, nothing on the
 * hot paths. "Appear offline" keeps pinging but shows the member as offline to everyone.
 */
export class PresenceBook {
  constructor(private services: Services) {}

  private row(id: string) {
    return this.services.db
      .prepare('SELECT last_seen, appear_offline FROM presence WHERE account_id = ?')
      .get(id) as Row | undefined;
  }

  ping(id: string) {
    this.services.db
      .prepare(
        `INSERT INTO presence (account_id, last_seen) VALUES (?, ?)
           ON CONFLICT(account_id) DO UPDATE SET last_seen = excluded.last_seen`,
      )
      .run(id, this.services.now());
  }

  settings(id: string): SocialSettings {
    return { appearOffline: this.row(id)?.appear_offline === 1 };
  }

  setAppearOffline(id: string, appearOffline: boolean) {
    this.services.db
      .prepare(
        `INSERT INTO presence (account_id, appear_offline) VALUES (?, ?)
           ON CONFLICT(account_id) DO UPDATE SET appear_offline = excluded.appear_offline`,
      )
      .run(id, appearOffline ? 1 : 0);
  }

  /** What a friend sees: offline, online, or playing (seated at a table, which one is private). */
  of(id: string): Presence {
    const row = this.row(id);
    if (!row || row.appear_offline === 1) return 'offline';
    if (this.services.now() - row.last_seen > ONLINE_WINDOW_MS) return 'offline';
    return this.services.rooms.roomsOf(id).length > 0 ? 'playing' : 'online';
  }
}
