import { useQuery } from '@tanstack/react-query';
import { dlcApi, type ExpansionCatalog } from '@cardgame/protocol';
import { keys } from '../../app/query';
import { http } from '../../net/http';

/**
 * The expansions the viewer may pick for a table: the ones they own. Guests and offline
 * players get none, so they play the classic game.
 */
export function useOwnedExpansions(): string[] {
  const catalog = useQuery({
    queryKey: keys.expansions,
    queryFn: () => http.get<ExpansionCatalog>(dlcApi.expansions),
  });
  return catalog.data?.expansions.filter((e) => e.owned).map((e) => e.id) ?? [];
}
