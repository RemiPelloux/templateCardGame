import type { Db } from './database';
import type { Room } from '../rooms/model';

/** Where rooms survive a restart, and where finished matches are archived for replays. */
export class RoomStore {
  constructor(private db: Db) {}

  all(): Room[] {
    const rows = this.db.prepare('SELECT data FROM rooms').all() as { data: string }[];
    return rows.map((row) => JSON.parse(row.data) as Room);
  }

  save(room: Room) {
    this.db
      .prepare(
        `INSERT INTO rooms VALUES (?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET data = excluded.data, touched = excluded.touched`,
      )
      .run(room.code, JSON.stringify(room), room.touched);
  }

  delete(code: string) {
    this.db.prepare('DELETE FROM rooms WHERE code = ?').run(code);
  }

  /** Keeps a finished match (seed, options and history included): enough to replay it exactly. */
  archive(room: Room, ended: number) {
    if (!room.match) return;
    this.db
      .prepare(
        'INSERT INTO matches (game, rules_version, room, data, ended) VALUES (?, ?, ?, ?, ?)',
      )
      .run(room.match.game, room.match.rulesVersion, room.code, JSON.stringify(room.match), ended);
  }
}
