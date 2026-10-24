# Adding a feature

Every feature lives in one folder on each side, with the same name, and plugs into three
registries. Nothing else needs to change.

```text
packages/protocol/src/<feature>.ts      wire types and endpoints (`<feature>Api`)
packages/meta/src/<feature>…            pure rules of the metagame, if any (levels, prices…)
apps/server/src/features/<feature>/     index.ts (the Feature), service, routes, tests
apps/web/src/features/<feature>/        screens, hooks, i18n.ts
```

## Server

`apps/server/src/features/<feature>/index.ts` exports a `Feature` (`core/feature.ts`):

```ts
export const shopFeature: Feature = {
  name: 'shop',
  migrations: [{ id: 'shop.1-orders', up: 'CREATE TABLE orders (…)' }],
  start({ events, wallet }) { events.on('match.finished', …) },
  routes(router, services) { router.on('POST', shopApi.buy, async ({ me, body }) => …) },
  tick: every(MINUTE_MS, (services) => …),
  exportData: (accountId, services) => ({ … }),
};
```

and is listed once in `features/index.ts` (order = migration order).

- **Migrations** have permanent ids `<feature>.<n>-<what>`; never edit a shipped one. Tables that
  belong to a member reference `accounts(id) ON DELETE CASCADE`, so deleting an account cleans up.
- **Services** (`Services` in `core/feature.ts`): `db`, `now`, `config`, `events`, `limit`,
  `attempts`, `accounts`, `wallet`, `inventory`, `rooms`. A feature reaches another one only
  through these or through events, never by importing its folder.
- **Events** (`core/events.ts`): `account.created`, `account.deleted`, `match.finished`. Add an
  entry to `EventMap` to publish a new one.
- **Money and items**: always through `wallet` (idempotent with a `ref`) and `inventory`, inside
  `db.transaction` with whatever they pay for.
- **Errors**: `throw new ApiError(englishMessage, 'STABLE_CODE', status, params)`; add the
  code to the web's translations.
- **Server-dealt tables** (daily, ranked): `rooms.openMatch({ kind, players, bots, seed })`.

## Web

- Screens in `features/<feature>/`, registered in `app/screens.tsx` (lazy) with their route in
  `packages/protocol/src/routes.ts`; add it to `ACCOUNT_ONLY` if it needs a member.
- Text in `features/<feature>/i18n.ts` (see [i18n](i18n.md)), registered in `i18n/messages.ts`.
- Server state through TanStack Query (`app/query.ts`): one key per resource; mutations write
  their answer into the cache (`setQueryData`) or invalidate the keys they change (the wallet
  after a purchase).
- Forms and buttons use `useAction` for busy state and translated errors.

## Checklist

- [ ] Protocol types and endpoints; server feature with migrations, routes and tests
- [ ] Every member table cascades on account deletion; `exportData` returns the member's rows
- [ ] Web screens, English and French text, errors translated
- [ ] Docs: a section in the relevant guide; `pnpm verify` green
