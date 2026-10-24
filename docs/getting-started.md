# Getting started

This walk-through takes about twenty minutes: run the template, play it, find your way around
the code, make a first change, then plan your own game.

## 1. Run it

You need Node 22.12 or later and pnpm 10 (`corepack enable` installs pnpm).

```bash
git clone <your copy of the repository> my-game && cd my-game
pnpm install
pnpm dev
```

Open http://localhost:5173. `pnpm dev` serves the web app with hot reload **and** mounts the
real API in the same process, so everything works: accounts, tables, bots, the shop. Data is
kept in `data/game.sqlite` at the repository root; delete that file to start from scratch.

## 2. Play it

1. **Practice.** On the home page choose a number of players and _Play vs bots_. Practice
   runs entirely in your browser, works offline and needs no account.
2. **Create an account.** _Create an account_ asks for a username and a password, then shows
   eight recovery codes once: they are the only way back in if you forget the password.
3. **Open a table.** _Create a table_, _Add a bot_, _Deal_. This table runs on the server: open
   the same address in a private window with a second account to play against yourself.
4. **Look around.** The tab bar leads to the daily challenge, the shop, friends and your
   profile. Finished matches pay experience and coins; spend the coins in the shop.
5. **Switch language.** _Account → Language_ switches between English and French.

## 3. Find your way

Five shared packages and two apps. The rule of thumb: **rules in `packages/game`, everything
the player sees of them in `apps/web/src/game`**, the rest is platform.

| You want to…                    | Look in                                               |
| ------------------------------- | ----------------------------------------------------- |
| Change the rules                | `packages/game/src/` (`rules.ts`, `constants.ts`)     |
| Change how the table looks      | `apps/web/src/game/` (`Board.tsx`, `PlayingCard.tsx`) |
| Change a word on screen         | the `i18n.ts` next to the screen (English and French) |
| Change prices, levels, missions | `packages/meta/src/`                                  |
| Change a server feature         | `apps/server/src/features/<feature>/`                 |
| Change a screen                 | `apps/web/src/features/<feature>/`                    |
| Change colours and spacing      | `apps/web/src/styles/tokens.css`                      |
| Add an endpoint's types         | `packages/protocol/src/<feature>.ts`                  |

[Architecture](architecture.md) explains how these pieces talk to each other.

## 4. Make a first change

Deal six cards instead of five at tables of three or more players.

1. In `packages/game/src/constants.ts`, set `HAND_SIZE_GROUP = 6`.
2. Run `pnpm test`. The rules test that expects five cards fails and tells you where: update
   it. The conformance test still passes, which proves the change keeps the game well formed.
3. Run `pnpm sim --players 4` and compare game lengths before and after.
4. Reload the browser: new deals have six cards.

Then change a sentence: the home page tagline is `game.tagline` in `apps/web/src/game/i18n.ts`.
Edit the English text, and the compiler will not let you forget the French.

## 5. Check your work

```bash
pnpm verify     # formatting, layer boundaries, types, tests, build
pnpm test:e2e   # browser tests on a fresh in-memory server (port 4317)
```

`pnpm verify` is what CI runs; [testing](testing.md) explains each layer.

## 6. Make it yours

1. `pnpm rename "Moon Poker" moon-poker` renames the project, its packages and the image.
2. Write your rules document, then your `GameDefinition`: follow
   [making a game](making-a-game.md).
3. Draw your board and translate its text.
4. Decide what of the platform you keep. Every feature is a folder plus one registry line
   (see [adding a feature](features.md)); removing one is the reverse.
5. Deploy: [deployment](deployment.md).
