import type { Feature } from '../../core/feature';
import { roomRoutes } from './routes';

/** Tables: lobbies, bots, server-authoritative matches, live updates and the match archive. */
export const roomsFeature: Feature = {
  name: 'rooms',
  migrations: [
    {
      id: 'rooms.1-tables',
      up: `CREATE TABLE rooms (code TEXT PRIMARY KEY, data TEXT NOT NULL, touched INTEGER NOT NULL);
           CREATE TABLE matches (id INTEGER PRIMARY KEY, game TEXT NOT NULL,
             rules_version INTEGER NOT NULL, room TEXT NOT NULL, kind TEXT NOT NULL,
             data TEXT NOT NULL, ended INTEGER NOT NULL);
           CREATE INDEX matches_ended ON matches(ended);`,
    },
  ],
  start: ({ events, rooms }) =>
    events.on('account.deleted', ({ accountId }) => rooms.leaveAll(accountId)),
  routes: roomRoutes,
  tick: ({ rooms }) => rooms.tick(),
};
