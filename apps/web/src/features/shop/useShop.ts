import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  economyApi,
  shopApi,
  type InventoryView,
  type OpeningResponse,
  type PurchaseResponse,
  type ShopView,
  type WalletView,
} from '@cardgame/protocol';
import { keys } from '../../app/query';
import { http } from '../../net/http';
import { useSession } from '../account/useSession';

const KEY_BYTES = 16;
const HEX = 16;

/** A random idempotency key; `crypto.randomUUID` is missing outside secure contexts (LAN http). */
const requestKey = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(KEY_BYTES)), (byte) =>
    byte.toString(HEX).padStart(2, '0'),
  ).join('');

/** What the member owns and wears; read only once someone is signed in. */
export function useInventory() {
  const session = useSession();
  return useQuery({
    queryKey: keys.inventory,
    queryFn: () => http.get<InventoryView>(economyApi.inventory),
    enabled: session.status === 'signed-in',
  });
}

export function useShopView() {
  return useQuery({ queryKey: keys.shop, queryFn: () => http.get<ShopView>(shopApi.shop) });
}

/**
 * Buying and opening, each sent with a fresh idempotency key so a retried request is replayed by
 * the server rather than charged twice. The answer carries the new coins and inventory: they go
 * straight into the shared cache (the header's coins, the collection, the table's looks).
 */
export function usePurchase() {
  const client = useQueryClient();
  const adopt = <T extends PurchaseResponse>(response: T) => {
    client.setQueryData<WalletView>(keys.wallet, { coins: response.coins });
    client.setQueryData<InventoryView>(keys.inventory, response.inventory);
    void client.invalidateQueries({ queryKey: keys.shop });
    return response;
  };
  return {
    buy: async (item: string) =>
      adopt(await http.post<PurchaseResponse>(shopApi.buy, { item, request: requestKey() })),
    openBooster: async (booster: string) =>
      adopt(
        await http.post<OpeningResponse>(shopApi.openBooster, {
          booster,
          request: requestKey(),
        }),
      ),
  };
}
