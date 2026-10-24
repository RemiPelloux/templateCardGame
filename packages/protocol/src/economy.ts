/** A member's coins and the items they own or wear (card backs, felts, frames, expansions). */
export type WalletView = { coins: number };
export type InventoryView = { owned: string[]; equipped: Record<string, string> };
export type EquipRequest = { slot: string; item: string };

export const economyApi = {
  wallet: '/api/wallet',
  inventory: '/api/inventory',
  equip: '/api/inventory/equip',
} as const;
