# Adding a feature

A feature is one folder on the server, one folder in the web app, its types in the protocol,
and one line in each registry. Nothing else changes, and removing a feature is the reverse.

```text
packages/protocol/src/<feature>.ts      request and response types, endpoint paths
packages/meta/src/<feature>.ts          pure rules of the metagame, if any (prices, curves)
apps/server/src/features/<feature>/     index.ts (the Feature), services, routes, tests
apps/web/src/features/<feature>/        screens, hooks, i18n.ts
```

## Server

`apps/server/src/features/<feature>/index.ts` exports a `Feature` (`core/feature.ts`):

```ts
export const shopFeature: Feature = {
  name: 'shop',
  migrations: [{ id: 'shop.1-orders', up: 'CREATE TABLE shop_orders (…)' }],
  start({ events }) { events.on('match.finished', (result) => …) },
  routes(router, services) { router.on('POST', shopApi.buy, async ({ me, body }) => …) },
  tick: every(HOUR_MS, ({ db }) => …),
  exportData: (accountId, services) => ({ … }),
};
```

and is listed once in `apps/server/src/features/index.ts`. The order there is the order
migrations run, after the core's own `core.1-attempts`; `accounts` comes first because other
tables reference it.

| Member       | Purpose                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------- |
| `migrations` | Schema steps with permanent ids `<feature>.<n>-<what>`. Never edit a shipped one: append |
| `start`      | Runs once at start-up, after every migration: subscribe to events here                   |
| `routes`     | Registers endpoints; `me()` returns the signed-in player or answers `401 NO_SESSION`     |
| `tick`       | Background work every 200 ms; wrap it in `every(ms, task)` for anything slower           |
| `exportData` | This member's rows, JSON-safe, for the account export                                    |

What a feature may use, from `Services`:

| Service               | Gives                                                                               |
| --------------------- | ----------------------------------------------------------------------------------- |
| `db`, `now`           | The SQLite database and the clock (tests move it by hand)                           |
| `config`              | The validated configuration                                                         |
| `events`              | `account.created`, `account.deleted`, `match.finished`; add one in `core/events.ts` |
| `limit`               | Per-minute budgets: `limit('shop:<id>', 30)` answers `429 RATE_LIMITED` beyond      |
| `attempts`            | Persistent counters for sensitive actions (sign-in, recovery)                       |
| `accounts`            | Players by id or handle (`name#1234`)                                               |
| `wallet`, `inventory` | Coins and items; see [economy](economy.md)                                          |
| `rooms`               | Tables; `rooms.openMatch(…)` deals a server table at once                           |

Rules that keep features independent:

- Reach another feature only through `Services` or an event, never by importing its folder.
- Member tables reference `accounts(id) ON DELETE CASCADE`.
- Pay and grant inside `db.transaction`, with an idempotency key (`ref`) on every payment.
- Refuse with `throw new ApiError(englishMessage, 'STABLE_CODE', status, params)` and translate
  the code in the feature's web bundle.

## Web

| Registry                               | Add                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `packages/protocol/src/routes.ts`      | The page's route and path                                                       |
| `apps/web/src/app/screens.tsx`         | The screen in `SCREENS` (loaded on demand); `ACCOUNT_ONLY` if it needs a member |
| `apps/web/src/app/nav.ts`              | A tab, if it deserves one (five at most on a phone)                             |
| `apps/web/src/i18n/messages.ts`        | The feature's translation bundle                                                |
| `apps/web/src/features/rooms/slots.ts` | A panel in the lobby or under a finished match                                  |

Conventions inside the folder:

- Server state goes through TanStack Query (`app/query.ts`): one key per resource. After a
  change, write the answer into the cache or invalidate what it changed (the wallet after a
  purchase).
- Forms and buttons use `useAction` for their busy state and translated errors.
- Every word goes through `t()`, in every language ([translations](i18n.md)).

## Checklist

- [ ] Protocol types and paths; server feature with migrations, routes and tests
- [ ] Member tables cascade on account deletion; `exportData` returns the member's rows
- [ ] Screens registered; text in every language; every error code translated
- [ ] A guide in `docs/`, linked from `docs/README.md`; endpoints added to [the API](api.md)
- [ ] `pnpm verify` passes
