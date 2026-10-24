import { shopApi } from '@cardgame/protocol';
import type { Feature } from '../../core/feature';
import { Orders, ordersMigration } from './orders';
import { productRequest } from './requests';
import { Shop } from './shop-service';

/** Purchases per member and minute: plenty for clicking, too few for a script. */
const PURCHASES_PER_MINUTE = 30;
const RELAXED = 10_000;

/** The shop: priced items and boosters, paid in coins (never real money). */
export const shopFeature: Feature = {
  name: 'shop',
  migrations: [ordersMigration],
  routes(router, services) {
    const shop = new Shop(services);
    const budget = (accountId: string) =>
      services.limit(
        `shop:${accountId}`,
        services.config.relaxedLimits ? RELAXED : PURCHASES_PER_MINUTE,
      );
    router
      .on('GET', shopApi.shop, ({ me }) => shop.view(me().id))
      .on('POST', shopApi.buy, async ({ me, body }) => {
        const accountId = me().id;
        budget(accountId);
        return shop.buy({ accountId, ...productRequest(await body(), 'item') });
      })
      .on('POST', shopApi.openBooster, async ({ me, body }) => {
        const accountId = me().id;
        budget(accountId);
        return shop.openBooster({ accountId, ...productRequest(await body(), 'booster') });
      });
  },
  exportData: (accountId, services) =>
    new Orders(services.db)
      .list(accountId)
      .map((order) => ({ ...order, result: JSON.parse(order.result) as unknown })),
};
