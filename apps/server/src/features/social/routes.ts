import { socialApi, type Player } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import type { Router } from '../../core/http/router';
import { WRITES_PER_MINUTE } from './limits';
import { spend } from './people';
import { fileReport } from './reports';
import type { SocialService } from './service';

type Body = Record<string, unknown>;
/** A write that names another member by handle; every one answers with the fresh overview. */
type HandleAction = (target: { me: Player; handle: unknown }) => void;

export function socialRoutes(router: Router, services: Services, social: SocialService) {
  const writer = (me: () => Player) => {
    const player = me();
    spend(services, { key: `write:${player.id}`, perMinute: WRITES_PER_MINUTE });
    return player;
  };
  const byHandle = (path: string, action: HandleAction) =>
    router.on('POST', path, async ({ me, body }) => {
      const player = writer(me);
      action({ me: player, handle: ((await body()) as Body).handle });
      return social.overview(player.id);
    });

  router
    .on('GET', socialApi.overview, ({ me }) => social.overview(me().id))
    .on('POST', socialApi.presence, ({ me }) => social.pulse(me().id))
    .on('POST', socialApi.settings, async ({ me, body }) => {
      const player = writer(me);
      social.presence.setAppearOffline(player.id, (await body()).appearOffline === true);
      return social.overview(player.id);
    });
  byHandle(socialApi.request, (t) => social.friends.request(t));
  byHandle(socialApi.accept, (t) => social.friends.accept(t));
  byHandle(socialApi.decline, (t) => social.friends.dismiss(t));
  byHandle(socialApi.cancel, (t) => social.friends.dismiss(t));
  byHandle(socialApi.remove, (t) => social.friends.remove(t));
  byHandle(socialApi.block, (t) => social.blocks.block(t));
  byHandle(socialApi.unblock, (t) => social.blocks.unblock(t));
  inviteRoutes(router, { services, social, writer });
}

function inviteRoutes(
  router: Router,
  deps: { services: Services; social: SocialService; writer: (me: () => Player) => Player },
) {
  const { services, social, writer } = deps;
  router
    .on('POST', socialApi.invite, async ({ me, body }) => {
      const input = await body();
      social.invites.send({ me: writer(me), handle: input.handle, room: input.room });
    })
    .on('POST', socialApi.dismissInvite, async ({ me, body }) => {
      const player = writer(me);
      social.invites.dismiss(player.id, (await body()).id);
      return social.overview(player.id);
    })
    .on('POST', socialApi.report, async ({ me, body }) => {
      fileReport(services, { me: writer(me), body: await body() });
    });
}
