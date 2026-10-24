import { expansions } from '@cardgame/game';
import { itemById } from '@cardgame/meta';
import type { ExpansionCatalog } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { ApiError } from '../../core/http/errors';

const FORBIDDEN = 403;
/** Features meet through services, not imports: the guard's type comes from the service. */
type OptionsGuard = Parameters<Services['rooms']['guardOptions']>[0];

/** The item that unlocks an expansion; a missing one is a catalog bug caught by the tests. */
function itemOf(id: string) {
  const item = itemById(expansions.get(id)?.manifest.item ?? '');
  if (!item || item.kind !== 'expansion') throw new Error(`Expansion ${id} has no item.`);
  return item;
}

/** Every expansion, owned or not by `accountId` (null: a guest, who owns none). */
export function catalog(accountId: string | null, { inventory }: Services): ExpansionCatalog {
  return {
    expansions: expansions.list.map(({ manifest }) => ({
      id: manifest.id,
      item: manifest.item,
      price: itemOf(manifest.id).price ?? null,
      rulesVersion: manifest.rulesVersion,
      owned: accountId !== null && inventory.owns(accountId, manifest.item),
    })),
  };
}

/** A host may only deal with an expansion they own; guests at their table play it freely. */
export const ownedExpansionOnly =
  ({ inventory }: Services): OptionsGuard =>
  ({ player, options }) => {
    const id = options.expansion;
    if (!id || !expansions.isId(id)) return;
    if (!inventory.owns(player.id, itemOf(id).id))
      throw new ApiError('You do not own this expansion.', 'EXPANSION_NOT_OWNED', FORBIDDEN, {
        expansion: id,
      });
  };
