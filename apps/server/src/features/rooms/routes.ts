import { api, normalizeRoomCode, type Player } from '@cardgame/protocol';
import type { Config } from '../config';
import { clientAddress } from '../http/policy';
import { readCookie } from '../http/io';
import type { Limiter } from '../http/rate-limit';
import { cleanName, SESSION_COOKIE, sessionCookie, type Sessions } from '../identity/sessions';
import { streamRoom } from '../rooms/room-events';
import type { RoomService } from '../rooms/room-service';
import { commandRequest, seatsRequest, startRequest } from './requests';
import { Router, STREAMING } from './router';

/** Requests per minute. Generous for play, tight for creating identities. */
const LIMITS = { sessions: 10, writes: 240 };

export type Services = { config: Config; sessions: Sessions; rooms: RoomService; limit: Limiter };

const code = (params: string[]) => normalizeRoomCode(params[0] ?? '');

export function routes({ config, sessions, rooms, limit }: Services): Router {
  /** The signed-in player, counted against their write budget. */
  const writer = (me: () => Player) => {
    const player = me();
    limit(`write:${player.id}`, LIMITS.writes);
    return player;
  };
  return new Router()
    .on('GET', api.health, () => ({ ok: true, rooms: rooms.size, streams: rooms.events.size }))
    .on('GET', api.session, ({ me }) => ({ player: me() }))
    .on('POST', api.session, async ({ req, res, body }) => {
      limit(`session:${clientAddress(req, config)}`, LIMITS.sessions);
      const { token, player } = sessions.create(cleanName((await body()).name));
      res.setHeader('Set-Cookie', sessionCookie(token, config.production));
      return { player };
    })
    .on('DELETE', api.session, ({ req, res }) => {
      sessions.revoke(readCookie(req, SESSION_COOKIE));
      res.setHeader('Set-Cookie', sessionCookie('', config.production, 0));
    })
    .on('POST', api.rooms, ({ me }) => rooms.create(writer(me)))
    .on('GET', api.room(':code'), ({ params, me }) => rooms.view(code(params), me()))
    .on('POST', api.join(':code'), ({ params, me }) => rooms.join(code(params), writer(me)))
    .on('POST', api.leave(':code'), ({ params, me }) => {
      rooms.leave(code(params), writer(me));
    })
    .on('POST', api.seats(':code'), async ({ params, me, body }) =>
      rooms.seats(code(params), writer(me), seatsRequest(await body())),
    )
    .on('POST', api.start(':code'), async ({ params, me, body }) =>
      rooms.start(code(params), writer(me), startRequest(await body())),
    )
    .on('POST', api.commands(':code'), async ({ params, me, body }) =>
      rooms.play(code(params), writer(me), commandRequest(await body())),
    )
    .on('GET', api.events(':code'), ({ req, res, params, me }) => {
      const room = code(params);
      const disconnect = rooms.connect(room, me());
      streamRoom(req, res, (listener) => {
        const unsubscribe = rooms.events.subscribe(room, listener);
        return () => {
          unsubscribe();
          disconnect();
        };
      });
      return STREAMING;
    });
}
