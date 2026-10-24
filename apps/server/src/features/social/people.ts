import type { Player, SocialPlayer } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { ApiError } from '../../core/http/errors';
import { RELAXED } from './limits';

const NOT_FOUND = 404;
const BAD_REQUEST = 400;

/** The public face of a member: their handle, never their account id. */
export const publicOf = (player: Player): SocialPlayer => ({ name: player.name, tag: player.tag });

/** The member behind a typed handle (`ada#1234`), refusing unknown ones and oneself. */
export function memberByHandle(services: Services, input: { me: Player; handle: unknown }): Player {
  const handle = typeof input.handle === 'string' ? input.handle.trim() : '';
  const player = handle.includes('#') ? services.accounts.byHandle(handle) : null;
  if (!player) throw new ApiError('No player has this handle.', 'UNKNOWN_PLAYER', NOT_FOUND);
  if (player.id === input.me.id)
    throw new ApiError('That is your own handle.', 'SELF_TARGET', BAD_REQUEST);
  return player;
}

/** One write budget per member and action, lifted on test servers. */
export function spend(services: Services, input: { key: string; perMinute: number }) {
  const { config, limit } = services;
  limit(`social:${input.key}`, config.relaxedLimits ? RELAXED : input.perMinute);
}
