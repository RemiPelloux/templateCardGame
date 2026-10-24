import type { InventoryView } from './economy';

/**
 * Wire types and endpoints of the shop: coins only, never real money. Item and booster ids come
 * from `@cardgame/meta`; the client translates them.
 */
export type ItemOffer = { item: string; price: number };
export type BoosterOffer = { booster: string; price: number; reveals: number };
/** Priced items the member does not own yet, every booster, and the member's coins. */
export type ShopView = { coins: number; items: ItemOffer[]; boosters: BoosterOffer[] };

/**
 * `request` is an optional idempotency key the client picks per click (a UUID): sending the same
 * one again replays the first answer instead of charging twice.
 */
export type BuyRequest = { item: string; request?: string };
export type OpenBoosterRequest = { booster: string; request?: string };

export type PurchaseResponse = { coins: number; inventory: InventoryView };
/** One revealed item; a duplicate was not granted again but refunded `refund` coins. */
export type BoosterReveal = { item: string; rarity: string; duplicate: boolean; refund: number };
export type OpeningResponse = PurchaseResponse & {
  booster: string;
  reveals: BoosterReveal[];
  /** Total coins given back for duplicates. */
  refund: number;
};

/** Longest accepted idempotency key. */
export const SHOP_REQUEST_MAX_LENGTH = 64;

export const shopApi = {
  shop: '/api/shop',
  buy: '/api/shop/buy',
  openBooster: '/api/shop/boosters/open',
} as const;
