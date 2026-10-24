# Design

The look of the app is a set of CSS variables, a handful of shared components and a few
accessibility rules. Rebranding the template is mostly an edit of one file.

## Tokens

`apps/web/src/styles/tokens.css` defines every colour, size, shadow and duration; components
only reference these variables.

| Group      | Tokens                                                                                                                                                   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonts      | `--font-body` (system sans-serif), `--font-display` (system serif)                                                                                       |
| Interface  | `--ink`, `--muted`, `--canvas`, `--surface`, `--line`, `--accent`, `--accent-hover`, `--accent-ink`, `--focus`                                           |
| States     | `--danger-bg`, `--danger-ink`, `--info-bg`, `--online`, `--gold`                                                                                         |
| Rarities   | `--rarity-common`, `--rarity-rare`, `--rarity-epic`, `--rarity-legendary`                                                                                |
| Table felt | `--felt`, `--felt-deep`, `--felt-ink`, `--felt-muted`                                                                                                    |
| Cards      | `--card-face`, `--card-edge`, `--card-black`, `--card-red`, `--card-back`, `--card-back-pattern`, `--card-width` (58–92 px, fluid), `--card-ratio` (1.4) |
| Shape      | `--radius-sm` 8, `--radius-md` 14, `--radius-lg` 22 (px)                                                                                                 |
| Space      | `--space-1` 4, `--space-2` 8, `--space-3` 12, `--space-4` 16, `--space-6` 24, `--space-8` 32 (px)                                                        |
| Layout     | `--control-height` 44 px, `--page-max` 1100 px, `--tabbar-height` 60 px                                                                                  |
| Depth      | `--shadow-1`, `--shadow-2`                                                                                                                               |
| Motion     | `--motion-fast` 140 ms, `--motion-medium` 240 ms, `--ease`                                                                                               |

Dark mode follows the system (`prefers-color-scheme`) and redefines the interface, state,
felt and card-face colours. Reduced motion sets the durations to zero. A member's equipped
felt and card back override the felt and card-back tokens on their own table.

## Stylesheets

`apps/web/src/styles/index.css` fixes the order: tokens, base, components, shell, page, home,
table, cards, progression, competitive, shop. Two features keep their sheet next to their
components: `features/pwa/pwa.css` and `features/friends/friends.css`. Class names follow
`block__element--modifier`. The layout switches to one column, with the tab bar, under 760 px.

## Components

| Component                 | File                   | Use                                                   |
| ------------------------- | ---------------------- | ----------------------------------------------------- |
| `Button`                  | `ui/Button.tsx`        | `primary`, `secondary`, `ghost`, `danger`; 44 px high |
| `Field`                   | `ui/Field.tsx`         | Labelled input with a hint, wired for screen readers  |
| `Notice`                  | `ui/Notice.tsx`        | `error` (announced as an alert) or `info` (a status)  |
| `Page`                    | `ui/Page.tsx`          | A screen's heading and column                         |
| `Link`                    | `app/Link.tsx`         | In-app link that keeps new-tab clicks working         |
| `Table`                   | `table/Table.tsx`      | The table: bar, seats, felt with the board, log       |
| `PlayingCard`, `CardBack` | `game/PlayingCard.tsx` | A standard card: `playable`, `idle` or `dimmed`       |

## Accessibility

- A card you can play is a button with a spoken name ("Queen of Hearts"); a card you cannot
  play is disabled, not only greyed. Elsewhere a card is an image with the same name.
- The seat to play is marked `aria-current="step"`; the prompt and the log are live regions.
- Focus is always visible: a 3 px outline in `--focus`.
- Controls are at least 44 px high.
- Colour is never the only signal: playable cards also lift, suits keep their symbol, presence
  is written as well as coloured.
- Dialogs use the native `<dialog>` element, so focus and Escape behave as expected.
