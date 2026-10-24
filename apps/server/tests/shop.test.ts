import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { BOOSTER_POOL, boosterById, DUPLICATE_REFUND, itemById, RARITIES } from '@cardgame/meta';
import {
  accountApi,
  shopApi,
  type OpeningResponse,
  type Player,
  type RegisterResponse,
  type ShopView,
} from '@cardgame/protocol';
import { createApplication } from '../src/app';
import type { Services } from '../src/core/feature';
import { Shop } from '../src/features/shop/shop-service';
import { PASSWORD, signUp, testConfig, testServices } from './support';

const OCEAN = 'back-ocean';
const STANDARD = 'booster-standard';
const OCEAN_PRICE = itemById(OCEAN)!.price!;
const STANDARD_PRICE = boosterById(STANDARD)!.price;
const PLENTY = 10_000;

let services: Services;
let shop: Shop;
let ada: Player;
beforeEach(async () => {
  ({ services } = testServices());
  shop = new Shop(services);
  ada = await signUp(services, 'ada');
});

const fund = (amount: number) => services.wallet.credit(ada.id, { amount, reason: 'test' });
const buy = (product: string, request = crypto.randomUUID()) =>
  shop.buy({ accountId: ada.id, product, request });
const open = (product = STANDARD, request = crypto.randomUUID()) =>
  shop.openBooster({ accountId: ada.id, product, request });
const count = (table: string) =>
  (services.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

describe('buying an item', () => {
  it('lists priced items not owned, then debits and grants together', () => {
    fund(OCEAN_PRICE);
    expect(shop.view(ada.id).items.map((o) => o.item)).toContain(OCEAN);
    const bought = buy(OCEAN);
    expect(bought.coins).toBe(0);
    expect(bought.inventory.owned).toContain(OCEAN);
    expect(shop.view(ada.id).items.map((o) => o.item)).not.toContain(OCEAN);
  });

  it('refuses without enough coins, leaving nothing behind', () => {
    fund(OCEAN_PRICE - 1);
    expect(() => buy(OCEAN)).toThrow(expect.objectContaining({ code: 'INSUFFICIENT_COINS' }));
    expect(services.inventory.owns(ada.id, OCEAN)).toBe(false);
    expect(services.wallet.balance(ada.id)).toBe(OCEAN_PRICE - 1);
    expect(count('shop_orders')).toBe(0);
  });

  it('refuses owned, unpriced and unknown items', () => {
    fund(PLENTY);
    buy(OCEAN);
    expect(() => buy(OCEAN)).toThrow(expect.objectContaining({ code: 'ALREADY_OWNED' }));
    expect(() => buy('back-gold')).toThrow(expect.objectContaining({ code: 'NOT_FOR_SALE' }));
    expect(() => buy('back-nowhere')).toThrow(expect.objectContaining({ code: 'UNKNOWN_ITEM' }));
    expect(services.wallet.balance(ada.id)).toBe(PLENTY - OCEAN_PRICE);
  });

  it('replays a retried request instead of charging twice', () => {
    fund(PLENTY);
    const first = buy(OCEAN, 'click-1');
    expect(buy(OCEAN, 'click-1')).toEqual(first);
    expect(services.wallet.balance(ada.id)).toBe(PLENTY - OCEAN_PRICE);
    expect(() => buy('felt-navy', 'click-1')).toThrow(
      expect.objectContaining({ code: 'REQUEST_REUSED' }),
    );
  });
});

describe('opening a booster', () => {
  it('debits, grants what was revealed and logs the opening', () => {
    fund(STANDARD_PRICE);
    const opened = open();
    expect(opened.reveals).toHaveLength(boosterById(STANDARD)!.reveals);
    for (const reveal of opened.reveals.filter((r) => !r.duplicate))
      expect(services.inventory.owns(ada.id, reveal.item)).toBe(true);
    expect(opened.coins).toBe(opened.refund);
    expect(count('shop_orders')).toBe(1);
  });

  it('refunds duplicates by rarity', () => {
    for (const rarity of RARITIES)
      for (const item of BOOSTER_POOL[rarity]) services.inventory.grant(ada.id, item.id, 'test');
    fund(STANDARD_PRICE);
    const opened = open();
    expect(opened.reveals.every((r) => r.duplicate)).toBe(true);
    const refund = opened.reveals.reduce(
      (sum, r) => sum + DUPLICATE_REFUND[r.rarity as keyof typeof DUPLICATE_REFUND],
      0,
    );
    expect(opened.refund).toBe(refund);
    expect(services.wallet.balance(ada.id)).toBe(refund);
  });

  it('replays the same reveal for a retried request', () => {
    fund(PLENTY);
    const first = open(STANDARD, 'click-2');
    const again = open(STANDARD, 'click-2');
    expect(again.reveals).toEqual(first.reveals);
    expect(again.coins).toBe(first.coins);
  });

  it('refuses unknown boosters and short wallets', () => {
    fund(STANDARD_PRICE - 1);
    expect(() => open('booster-nowhere')).toThrow(
      expect.objectContaining({ code: 'UNKNOWN_BOOSTER' }),
    );
    expect(() => open()).toThrow(expect.objectContaining({ code: 'INSUFFICIENT_COINS' }));
    expect(services.wallet.balance(ada.id)).toBe(STANDARD_PRICE - 1);
  });
});

describe('account deletion', () => {
  it('removes the member’s orders', async () => {
    fund(PLENTY);
    buy(OCEAN);
    open();
    await services.accounts.delete(ada.id, PASSWORD);
    expect(count('shop_orders')).toBe(0);
  });
});

describe('shop over http', () => {
  let app: ReturnType<typeof createApplication>;
  let base = '';
  beforeEach(async () => {
    app = createApplication(testConfig());
    await new Promise<void>((done) => app.server.listen(0, '127.0.0.1', done));
    base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
  });
  afterEach(() => app.close());

  it('shows offers, refuses a bad body and exports orders', async () => {
    let cookie = '';
    const call = async (path: string, body?: unknown) => {
      const response = await fetch(base + path, {
        method: body ? 'POST' : 'GET',
        headers: { cookie, ...(body ? { 'content-type': 'application/json' } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      cookie = response.headers.get('set-cookie')?.split(';')[0] ?? cookie;
      return { status: response.status, body: (await response.json()) as unknown };
    };
    expect((await call(shopApi.shop)).status).toBe(401);
    const registered = await call(accountApi.register, { username: 'bea', password: PASSWORD });
    const view = (await call(shopApi.shop)).body as ShopView;
    expect(view.coins).toBe(0);
    expect(view.boosters.map((b) => b.booster)).toContain(STANDARD);
    expect((await call(shopApi.buy, { item: 42 })).status).toBe(400);
    const poor = await call(shopApi.openBooster, { booster: STANDARD });
    expect(poor.body).toMatchObject({ error: { code: 'INSUFFICIENT_COINS' } });
    const bea = (registered.body as RegisterResponse).player;
    app.api.services.wallet.credit(bea.id, { amount: STANDARD_PRICE, reason: 'test' });
    const opened = (await call(shopApi.openBooster, { booster: STANDARD, request: 'r-1' }))
      .body as OpeningResponse;
    expect(opened.reveals).toHaveLength(boosterById(STANDARD)!.reveals);
    expect((await call(accountApi.export)).body).toMatchObject({
      shop: [
        { request: 'r-1', kind: 'booster', product: STANDARD, result: { refund: opened.refund } },
      ],
    });
  });
});
