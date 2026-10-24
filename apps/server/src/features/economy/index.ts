import { economyApi } from '@cardgame/protocol';
import type { Feature } from '../../core/feature';

/** Coins and items: the services the shop, progression and the daily challenge pay through. */
export const economyFeature: Feature = {
  name: 'economy',
  migrations: [
    {
      id: 'economy.1-tables',
      up: `CREATE TABLE wallets (account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
             coins INTEGER NOT NULL CHECK (coins >= 0));
           CREATE TABLE coin_ledger (id INTEGER PRIMARY KEY,
             account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
             delta INTEGER NOT NULL, reason TEXT NOT NULL, ref TEXT, created INTEGER NOT NULL,
             UNIQUE (account_id, ref));
           CREATE TABLE inventory (account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
             item_id TEXT NOT NULL, source TEXT NOT NULL, acquired INTEGER NOT NULL,
             PRIMARY KEY (account_id, item_id));
           CREATE TABLE equipped (account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
             slot TEXT NOT NULL, item_id TEXT NOT NULL, PRIMARY KEY (account_id, slot));`,
    },
  ],
  routes(router, { wallet, inventory }) {
    router
      .on('GET', economyApi.wallet, ({ me }) => ({ coins: wallet.balance(me().id) }))
      .on('GET', economyApi.inventory, ({ me }) => inventory.view(me().id))
      .on('POST', economyApi.equip, async ({ me, body }) => {
        const input = await body();
        inventory.equip(me().id, input.slot, input.item);
        return inventory.view(me().id);
      });
  },
  exportData: (accountId, { wallet, inventory }) => ({
    coins: wallet.balance(accountId),
    ledger: wallet.history(accountId, Number.MAX_SAFE_INTEGER),
    inventory: inventory.view(accountId),
  }),
};
