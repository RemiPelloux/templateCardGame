import { openDatabase } from '../src/storage/database';
import { RoomStore } from '../src/storage/room-store';
import { RoomService } from '../src/rooms/room-service';

export const alice = { id: 'alice', name: 'Alice' };
export const bob = { id: 'bob', name: 'Bob' };

/** A room service on an in-memory database with a clock the test moves by hand. */
export function rooms() {
  const clock = { now: 1_000_000 };
  const db = openDatabase(':memory:');
  const store = new RoomStore(db);
  const service = new RoomService(store, () => clock.now);
  return { service, store, db, clock };
}
