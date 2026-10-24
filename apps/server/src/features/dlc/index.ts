import { dlcApi } from '@cardgame/protocol';
import type { Feature } from '../../core/feature';
import { catalog, ownedExpansionOnly } from './catalog';

/**
 * Expansions: which ones exist, who owns them, which a table plays with. The rules live in
 * packages/game/src/expansions; ownership is an item in the inventory, sold by the shop.
 */
export const dlcFeature: Feature = {
  name: 'dlc',
  start: (services) => services.rooms.guardOptions(ownedExpansionOnly(services)),
  routes(router, services) {
    router.on('GET', dlcApi.expansions, ({ player }) => catalog(player?.id ?? null, services));
  },
};
