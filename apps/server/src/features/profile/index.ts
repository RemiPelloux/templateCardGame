import { profileApi } from '@cardgame/protocol';
import type { Feature } from '../../core/feature';
import { ApiError } from '../../core/http/errors';
import { profileOf } from './profile';

/** `ada-1234` (as in paths) or `ada#1234` → `ada#1234`. */
const NOT_FOUND = 404;

const handleOf = (param: string) => (param.includes('#') ? param : param.replace(/-(\d+)$/, '#$1'));

/** Public profiles: avatar, level, stats, achievements and recent matches. */
export const profileFeature: Feature = {
  name: 'profile',
  routes(router, services) {
    router
      .on('GET', profileApi.mine, ({ me }) => profileOf(services, me()))
      .on('GET', profileApi.of(':handle'), ({ me, params }) => {
        me(); // Profiles are for members, like the rest of the social pages.
        const player = services.accounts.byHandle(handleOf(params[0] ?? ''));
        if (!player) throw new ApiError('No player has this name.', 'PROFILE_NOT_FOUND', NOT_FOUND);
        return profileOf(services, player);
      });
  },
};
