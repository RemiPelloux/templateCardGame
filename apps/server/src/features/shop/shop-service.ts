import { createRng, randomSeed } from '@cardgame/engine';
import { BOOSTERS, boosterById, itemById, ITEMS, openBooster, type Opening } from '@cardgame/meta';
import type { OpeningResponse, PurchaseResponse, ShopView } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { ApiError } from '../../core/http/errors';
import { Orders, type Order, type OrderKind } from './orders';

const NOT_FOUND = 404;
const CONFLICT = 409;

/** One purchase: who, which product, and the member's idempotency key. */
export type ShopRequest = { accountId: string; product: string; request: string };

type Deps = Pick<Services, 'db' | 'now' | 'wallet' | 'inventory'>;

/**
 * Buying items and opening boosters with coins. Each purchase debits, grants and logs in one
 * transaction, so a refusal anywhere leaves the member exactly as they were; the coin ledger's
 * `ref` and the order's request key make a retried click replay instead of charging twice.
 */
export class Shop {
  private orders: Orders;

  constructor(private deps: Deps) {
    this.orders = new Orders(deps.db);
  }

  view(accountId: string): ShopView {
    const { wallet, inventory } = this.deps;
    return {
      coins: wallet.balance(accountId),
      items: ITEMS.filter((i) => i.price && !inventory.owns(accountId, i.id)).map((i) => ({
        item: i.id,
        price: i.price!,
      })),
      boosters: BOOSTERS.map((b) => ({ booster: b.id, price: b.price, reveals: b.reveals })),
    };
  }

  buy(input: ShopRequest): PurchaseResponse {
    return this.deps.db.transaction(() => {
      if (this.replayed(input, 'item')) return this.state(input.accountId);
      const item = itemById(input.product);
      if (!item) throw new ApiError('This item does not exist.', 'UNKNOWN_ITEM', NOT_FOUND);
      if (!item.price) throw new ApiError('This item is not for sale.', 'NOT_FOR_SALE');
      if (this.deps.inventory.owns(input.accountId, item.id))
        throw new ApiError('You already own this item.', 'ALREADY_OWNED', CONFLICT);
      this.charge(input, item.price);
      this.deps.inventory.grant(input.accountId, item.id, 'shop');
      this.log(input, { kind: 'item', price: item.price, result: { items: [item.id] } });
      return this.state(input.accountId);
    })();
  }

  openBooster(input: ShopRequest): OpeningResponse {
    return this.deps.db.transaction(() => {
      const previous = this.replayed(input, 'booster');
      if (previous) return this.opening(input, JSON.parse(previous.result) as Opening);
      const booster = boosterById(input.product);
      if (!booster)
        throw new ApiError('This booster does not exist.', 'UNKNOWN_BOOSTER', NOT_FOUND);
      this.charge(input, booster.price);
      const rng = createRng({ rng: randomSeed() });
      const owned = this.deps.inventory.owned(input.accountId);
      const opened = openBooster(booster, () => rng.next(), owned);
      for (const reveal of opened.reveals)
        if (!reveal.duplicate) this.deps.inventory.grant(input.accountId, reveal.item, 'booster');
      if (opened.refund)
        this.deps.wallet.credit(input.accountId, {
          amount: opened.refund,
          reason: 'shop.refund',
          ref: `shop-refund:${input.request}`,
        });
      this.log(input, { kind: 'booster', price: booster.price, result: opened });
      return this.opening(input, opened);
    })();
  }

  /** The earlier order behind this request key, refusing a key reused for something else. */
  private replayed(input: ShopRequest, kind: OrderKind): Order | undefined {
    const order = this.orders.find(input.accountId, input.request);
    if (order && (order.kind !== kind || order.product !== input.product))
      throw new ApiError('This request was already used.', 'REQUEST_REUSED', CONFLICT);
    return order;
  }

  private charge(input: ShopRequest, price: number) {
    this.deps.wallet.debit(input.accountId, {
      amount: price,
      reason: 'shop.buy',
      ref: `shop:${input.request}`,
    });
  }

  private log(input: ShopRequest, order: { kind: OrderKind; price: number; result: unknown }) {
    this.orders.add(input.accountId, {
      request: input.request,
      kind: order.kind,
      product: input.product,
      price: order.price,
      result: JSON.stringify(order.result),
      created: this.deps.now(),
    });
  }

  private state(accountId: string): PurchaseResponse {
    return {
      coins: this.deps.wallet.balance(accountId),
      inventory: this.deps.inventory.view(accountId),
    };
  }

  private opening(input: ShopRequest, opened: Opening): OpeningResponse {
    return { ...this.state(input.accountId), booster: input.product, ...opened };
  }
}
