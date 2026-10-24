# Accounts

Members sign up with a username and a password. Recovery codes replace a reset email,
sessions are listed per device, and a member can download or delete everything the app keeps
about them.

## How it works

**Identity.** A username is 3 to 20 lowercase letters, digits or `_`, unique, and stored
lowercase. Each account also gets a random four-digit tag; `name#1234` is the _handle_ others
use to find a member. Passwords are 8 to 72 characters.

**Passwords** are hashed with scrypt (N = 2¹⁷, r = 8, p = 1: about 0.3 s and 128 MiB per check)
and stored as `scrypt$N$r$p$salt$hash`, so the cost can be raised later; a password stored at
an older cost is re-hashed at the next sign-in. At most four checks run at once, beyond which
the server answers `503 BUSY`. A sign-in for an unknown username still pays for one hash, so
response times do not reveal which names exist.

**Recovery codes.** Sign-up shows eight single-use codes once, like `ABCD-EFGH-JKMN` (12
characters, no `0`, `O`, `1`, `I` or `L`; spaces, dashes and case are ignored when typed back).
A code resets a forgotten password and signs out every device. Codes are hashed like passwords;
members can generate a new set (replacing the old one) under _Account_.

**Sessions.** Signing in sets the `cg_session` cookie: HttpOnly, `SameSite=Lax`, and `Secure` in
production. Only a hash of the token is stored. A session stays alive while it is used within
30 days; the cookie itself expires 30 days after sign-in. _Account_ lists each device by browser
and system (never an address) and can sign any other one out. Changing the password signs out
every other device.

**Guards against guessing.**

| Counter                             | Allows        | Then                                                              |
| ----------------------------------- | ------------- | ----------------------------------------------------------------- |
| Sign-ins per username               | 10 per 15 min | `429 TOO_MANY_ATTEMPTS`; cleared by a successful sign-in          |
| Recoveries per username             | 5 per 15 min  | `429 TOO_MANY_ATTEMPTS`; not cleared by success                   |
| Password confirmations per account  | 10 per 15 min | `429 TOO_MANY_ATTEMPTS`; for password change, new codes, deletion |
| Sign-ups per address                | 5 per minute  | `429 RATE_LIMITED`                                                |
| Sign-ins and recoveries per address | 30 per minute | `429 RATE_LIMITED`                                                |

The per-username counters are kept in the database, so they survive restarts.

**Export and deletion.** _Account → Download my data_ returns a JSON file with each feature's
part (`exportData`): account, coins and ledger, items, orders, progression, friends and
reports filed, daily results, ratings. Deleting the account asks for the password, announces
`account.deleted` (the member leaves every table), then removes the account row; every table
that belongs to a member is deleted with it. Two things stay: reports filed by or about the
member, kept for moderation with their side cleared, and the handle in their former ranked
opponents' histories.

**Language.** An account may save a preferred language; see [translations](i18n.md).

## Data

| Table            | Holds                                                            |
| ---------------- | ---------------------------------------------------------------- |
| `accounts`       | id, username, tag, password hash, language, creation date        |
| `sessions`       | token hash, public id, account, device label, created, last seen |
| `recovery_codes` | account, the code's first four characters, its hash, created     |
| `attempts`       | the per-username and per-account counters                        |

## On the web

- `features/account/AuthScreens.tsx`: sign-in, sign-up (then the recovery codes), recovery.
- `features/account/AccountScreen.tsx`: language, password, recovery codes, devices, data
  export, sign-out and deletion.
- Pages that need a member send guests to `/login?next=<page>` and bring them back after
  signing in (`app/screens.tsx`, `ACCOUNT_ONLY`). Practice and the rules page stay open to
  guests.

## Tuning

| Setting                     | Where                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| Username and password rules | `packages/protocol/src/limits.ts`                                |
| scrypt cost                 | `apps/server/src/core/config.ts` (`PRODUCTION_COST`)             |
| Counters, limits            | `apps/server/src/features/accounts/{accounts,routes}.ts`         |
| Session lifetime            | `apps/server/src/features/accounts/sessions.ts` (`SESSION_DAYS`) |

Test servers set `PASSWORD_COST=test` (N = 2¹⁰) and `RELAXED_LIMITS=1`; a production server
refuses to start with either.

## Extending

The rest of the app only needs a `Player` (`{ id, name, tag }`) from the session. To sign in
another way (an identity provider, passkeys), replace `apps/server/src/features/accounts` and
keep `accounts.resolve(token)`, `player(id)` and `byHandle(handle)`.

Endpoints: [HTTP API](api.md#accounts).
