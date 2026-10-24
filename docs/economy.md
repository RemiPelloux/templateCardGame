# Economy

Members earn coins by playing and spend them in the shop on cosmetics, boosters and
expansions. There is no real money anywhere.

## How it works

**Coins** live in a wallet with a ledger: every change is a row with a reason and, usually, a
reference. A reference can be used once per member, so a reward or a purchase retried after a
network error never pays or charges twice. The balance can never go below zero.

| Reason               | Reference                        | Paid by                                              |
| -------------------- | -------------------------------- | ---------------------------------------------------- |
| `reward.match`       | `reward:<room>:<seed>:<version>` | Every finished match ([progression](progression.md)) |
| `reward.level`       | `level:<n>`                      | Each level gained                                    |
| `reward.season`      | `season:<season>:<step>`         | Each season step                                     |
| `reward.achievement` | `achievement:<id>`               | Each achievement                                     |
| `reward.mission`     | `mission:<id>:<period>`          | Each claimed mission                                 |
| `daily`              | `daily:<day>`                    | The [daily challenge](competitive.md)                |
| `shop.buy`           | `shop:<request>`                 | A purchase (debit)                                   |
| `shop.refund`        | `shop-refund:<request>`          | Duplicates in a booster                              |

**Items** (`packages/meta/src/items.ts`) have a permanent id, a kind, a rarity and, when sold
directly, a price. Kinds are the three cosmetic slots — `cardBack`, `felt`, `frame` — and
`expansion`. Every member owns one starter per slot and wears it until they equip something
else.

| Item               | Kind      | Rarity    | Price | How to get it                           |
| ------------------ | --------- | --------- | ----- | --------------------------------------- |
| `back-ember`       | card back | common    | —     | Starter                                 |
| `back-ocean`       | card back | common    | 150   | Shop, boosters                          |
| `back-forest`      | card back | rare      | 400   | Shop, boosters                          |
| `back-sunset`      | card back | rare      | —     | Boosters                                |
| `back-royal`       | card back | epic      | —     | Boosters, level 25                      |
| `back-gold`        | card back | legendary | —     | Boosters, level 50                      |
| `felt-green`       | felt      | common    | —     | Starter                                 |
| `felt-navy`        | felt      | common    | 200   | Shop, boosters                          |
| `felt-teal`        | felt      | common    | 180   | Shop, boosters                          |
| `felt-burgundy`    | felt      | rare      | 500   | Shop, boosters                          |
| `felt-midnight`    | felt      | epic      | —     | Boosters, level 10                      |
| `frame-none`       | frame     | common    | —     | Starter                                 |
| `frame-bronze`     | frame     | common    | 120   | Shop, boosters                          |
| `frame-silver`     | frame     | rare      | 300   | Shop, boosters, 50 wins, season step 30 |
| `frame-ruby`       | frame     | epic      | —     | Boosters                                |
| `frame-gold`       | frame     | legendary | —     | Boosters, 200 wins                      |
| `expansion-jokers` | expansion | epic      | 800   | Shop                                    |

**Boosters** (`packages/meta/src/boosters.ts`) reveal three items each:

| Booster            | Price | Common | Rare | Epic | Legendary |
| ------------------ | ----- | ------ | ---- | ---- | --------- |
| `booster-standard` | 250   | 70 %   | 22 % | 7 %  | 1 %       |
| `booster-premium`  | 600   | —      | 60 % | 30 % | 10 %      |

Each reveal draws a rarity, then an item of that rarity the member does not own yet, while
any remain. Only then can a duplicate appear, and it is refunded instead: 25 coins for a
common, 60 rare, 150 epic, 400 legendary. Boosters hold cosmetics only, never starters or
expansions. The server draws with its own unpredictable seed.

**The shop** lists the items for sale that the member does not own, and the boosters. A
purchase takes the coins, grants the items, refunds duplicates and records the order in one
transaction. The client sends a request id with each purchase: sending the same id again does
not charge twice. A repeated item purchase answers with the current coins and inventory; a
repeated booster answers with the same reveal. Reusing an id for another product is refused
with `409 REQUEST_REUSED`. A member makes at most 30 purchases per minute.

**Cosmetics at the table.** The viewer's equipped felt and card back recolour their own table,
in practice and online (`apps/web/src/features/collection/looks.ts`). At online tables each
seat also shows its owner's frame around the avatar; the room view carries every seat's
equipped items (`SeatView.looks`). An item can only be equipped in its own slot, so
expansions are never "worn".

## Data

| Table         | Holds                                                      |
| ------------- | ---------------------------------------------------------- |
| `wallets`     | Each member's balance                                      |
| `coin_ledger` | Every movement, unique per member and reference            |
| `inventory`   | Items owned beyond the starters, with where they came from |
| `equipped`    | The item worn in each slot                                 |
| `shop_orders` | Each purchase or opening, its price and its result         |

All are deleted with the account and included in its export.

## Tuning

| What                             | Where                                                          |
| -------------------------------- | -------------------------------------------------------------- |
| Items, rarities, prices, colours | `packages/meta/src/items.ts`                                   |
| Boosters, weights, refunds       | `packages/meta/src/boosters.ts`                                |
| What matches pay                 | `packages/meta/src/rewards.ts` ([progression](progression.md)) |
| Purchase rate limit              | `apps/server/src/features/shop/index.ts`                       |

With a complete collection, a standard booster refunds about 136 coins on average and a
premium one about 363: always less than their price. Keep it that way when changing weights
or refunds.

## Extending

- **A new item**: add it to `ITEMS` with a new id (ids are permanent: never rename or reuse
  one), give it a name and description in every language in
  `apps/web/src/features/shop/i18n.ts`, and a price if the shop should sell it.
- **A new booster**: add it to `BOOSTERS`, with its name and description in the shop bundle.
- **A new slot**: add it to `SLOTS` with a starter item, then apply it where it is shown.

Endpoints: [HTTP API](api.md#economy) and [shop](api.md#shop).
