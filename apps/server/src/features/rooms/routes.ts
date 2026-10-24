import { normalizeRoomCode, roomApi, type Player } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { STREAMING, type Router } from '../../core/http/router';
import { commandRequest, optionsRequest, seatsRequest, startRequest } from './requests';
import { streamRoom } from './room-events';

/** Writes per minute and member: plenty for play, a ceiling for scripts. */
const WRITES_PER_MINUTE = 240;
const RELAXED = 10_000;

const code = (params: string[]) => normalizeRoomCode(params[0] ?? '');

export function roomRoutes(router: Router, { rooms, limit, config }: Services) {
  /** The signed-in player, counted against their write budget. */
  const writer = (me: () => Player) => {
    const player = me();
    limit(`write:${player.id}`, config.relaxedLimits ? RELAXED : WRITES_PER_MINUTE);
    return player;
  };
  router
    .on('GET', roomApi.mine, ({ me }) => rooms.roomsOf(me().id))
    .on('POST', roomApi.rooms, ({ me }) => rooms.create(writer(me)))
    .on('GET', roomApi.room(':code'), ({ params, me }) => rooms.view(code(params), me()))
    .on('POST', roomApi.join(':code'), ({ params, me }) => rooms.join(code(params), writer(me)))
    .on('POST', roomApi.leave(':code'), ({ params, me }) => {
      rooms.leave(code(params), writer(me));
    })
    .on('POST', roomApi.seats(':code'), async ({ params, me, body }) =>
      rooms.seats(code(params), writer(me), seatsRequest(await body())),
    )
    .on('POST', roomApi.options(':code'), async ({ params, me, body }) =>
      rooms.setOptions(code(params), writer(me), optionsRequest(await body())),
    )
    .on('POST', roomApi.start(':code'), async ({ params, me, body }) =>
      rooms.start(code(params), writer(me), startRequest(await body())),
    )
    .on('POST', roomApi.commands(':code'), async ({ params, me, body }) =>
      rooms.play(code(params), writer(me), commandRequest(await body())),
    )
    .on('GET', roomApi.events(':code'), ({ req, res, params, me }) => {
      const room = code(params);
      const disconnect = rooms.connect(room, me());
      streamRoom(req, res, (listener) => {
        const unsubscribe = rooms.live.subscribe(room, listener);
        return () => {
          unsubscribe();
          disconnect();
        };
      });
      return STREAMING;
    });
}
