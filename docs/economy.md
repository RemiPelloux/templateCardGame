# Economy: coins, items, boosters

The metagame runs on **coins only**. There is no real money anywhere: no payment provider, no
paid currency, nothing to buy outside the game. Members earn coins by playing (rewards credited
by other features) and spend them in the shop.

## Pieces

| Where                               | Holds                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/meta/src/items.ts`        | The item catalog: id, kind (`cardBack`, `felt`, `frame`, `expansion`), rarity, price, look |
| `packages/meta/src/boosters.ts`     | Boosters, the duplicate refunds and `openBooster`, a pure function                         |
| `apps/server/src/features/economy/` | `Wallet` (coins, idempotent ledger) and `Inventory` (owned, equipped)                      |
| `apps/server/src/features/shop/`    | The shop: offers, purchases, booster openings, the `shop_orders` log                       |
| `apps/web/src/features/shop/`       | Shop screen, booster reveal, item and booster names (`shop.items.<id>`)                    |
| `apps/web/src/features/collection/` | Collection screen (filter, equip) and the table looks (`looks.ts`)                         |

## Coins

`services.wallet` is the only way coins move. Every change is a row in `coin_ledger` with a
`reason` and an optional `ref`; a `ref` is used once per account, so a retried reward or
purchase never pays or charges twice. Debits refuse with `INSUFFICIENT_COINS` rather than go
below zero. Call the wallet inside `db.transaction` together with whatever the coins pay for.

## Items

An item has a permanent kebab-case id, a kind, a rarity and, optionally:

- `price`: it can be bought outright in the shop. Without one it only comes from boosters or
  rewards.
- `starter`: every account owns it from the start and wears it until something else is
  equipped. Each slot has exactly one starter.
- `look`: the colours the client applies: `base`/`stripe` for a card back, `felt`/`deep` for a
  felt, `ring` for a frame.

Expansions (`kind: 'expansion'`) are bought like any priced item; they are owned, never worn,
and boosters never reveal them.

### Where looks show

- The member's own **felt** and **card back** recolour the table they look at, in practice and
  online: `useTableLooks()` sets `--felt`, `--felt-deep`, `--card-back` and
  `--card-back-pattern` on `.table`. Starters set nothing, so the theme (and dark mode) decides.
- Each seat's **frame** rings its avatar at online tables. The room view's `SeatView.looks`
  carries every person's equipped item per slot (`null` for bots); the server reads it from
  `Inventory.equipped` through the `looks` function `RoomService` receives in `api.ts`.

## Boosters

A booster has a price, a number of reveals and a weight per rarity. `openBooster(booster,
random, owned)` rolls a rarity for each reveal by weight, then picks an item of that rarity:

- **Duplicate protection**: it picks among the items the member lacks while that rarity has
  any left; an item revealed earlier in the same opening counts as owned.
- **Refunds**: once a rarity is complete, a duplicate is not granted again but refunded
  `DUPLICATE_REFUND[rarity]` coins.

The pool is every cosmetic but the starters. The server opens with a fresh random seed and
stores the result, so a retried request shows the same reveal instead of opening again.

## The shop API

| Method | Path                      | Body                    | Answer                                               |
| ------ | ------------------------- | ----------------------- | ---------------------------------------------------- |
| GET    | `/api/shop`               |                         | `ShopView`: coins, priced items not owned, boosters  |
| POST   | `/api/shop/buy`           | `{ item, request? }`    | `PurchaseResponse`: coins, inventory                 |
| POST   | `/api/shop/boosters/open` | `{ booster, request? }` | `OpeningResponse`: reveals, refund, coins, inventory |

`request` is an idempotency key the client picks per purchase: sending it again replays the
first answer; reusing it for another product is refused (`REQUEST_REUSED`). Each purchase
debits, grants and logs in one transaction. Refusals: `UNKNOWN_ITEM`, `NOT_FOR_SALE`,
`ALREADY_OWNED`, `UNKNOWN_BOOSTER`, `INSUFFICIENT_COINS`, `RATE_LIMITED`. The account export
includes every order; deleting an account deletes them.

## Adding an item

1. Append it to `ITEMS` in `packages/meta/src/items.ts` with a new id (never rename or reuse
   one), its kind, rarity, `look`, and a `price` if the shop sells it.
2. Name and describe it in `apps/web/src/features/shop/item-text.ts`, in English and French.
   `apps/web/tests/shop.test.ts` fails on an item without a name.
3. `pnpm test`. A non-starter cosmetic joins the booster pool of its rarity automatically.

## Adding a booster

1. Append it to `BOOSTERS` in `packages/meta/src/boosters.ts`: id, price, reveals, weights.
2. Name and describe it under `boosters` in `apps/web/src/features/shop/i18n.ts`.
3. `pnpm test` checks it can reveal something and that its average refund stays below its price.

## Tuning prices and rarities

- **Prices** should be a few matches' rewards for a common item and many for a rare one; an
  epic or legendary item is usually booster-only, which keeps boosters worth opening.
- **Weights** are relative: `{ common: 70, rare: 22, epic: 7, legendary: 1 }` means a 1 % chance
  of a legendary per reveal. A weight of 0 leaves a rarity out (the premium booster has no
  commons).
- **Refunds** soften duplicates without making boosters a coin machine: the average refund of
  a pack whose pool is complete must stay below its price (tested).
- `packages/meta/tests/boosters.test.ts` checks the observed rarity shares against the weights
  over thousands of seeded openings; rerun it after any change.
