# Design

## Tokens

Every colour, radius, space, shadow and duration is a CSS variable in
`apps/web/src/styles/tokens.css`; components never hard-code them. Rebranding the template is
an edit of that file:

- **Chrome**: `--canvas`, `--surface`, `--ink`, `--muted`, `--line`, `--accent`
- **Felt**: `--felt`, `--felt-deep`, `--felt-ink`, `--felt-muted`
- **Cards**: `--card-face`, `--card-edge`, `--card-red`, `--card-black`, `--card-back*`,
  `--card-width` (fluid) and `--card-ratio`

Dark mode follows `prefers-color-scheme` by redefining the same tokens. Reduced motion sets the
durations to zero.

## Stylesheets

`styles/index.css` fixes the cascade: tokens → base → components → home → table → cards. Add a
file per area rather than growing one sheet; class names follow `block__element--modifier`.

## Components

| Component     | Use                                                   |
| ------------- | ----------------------------------------------------- |
| `Button`      | `primary`, `secondary`, `ghost`; 44 px minimum height |
| `Notice`      | A refused move or failed request, `role="alert"`      |
| `PlayingCard` | Face of a standard card; `playable`, `idle`, `dimmed` |
| `CardBack`    | Face-down card                                        |
| `Table`       | Generic shell: bar, seats, felt with the board, log   |

## Accessibility

- Every card is a `button` with a spoken name ("Queen of Hearts") when it can be played, an
  `img` with the same name otherwise; unplayable cards are disabled, not just greyed.
- The seat to play is marked `aria-current="step"`; the prompt and the log are live regions.
- Focus is always visible (`:focus-visible`, 3 px). Controls are at least 44 px high.
- Colour is never the only signal: playable cards also lift, suits keep their glyph.
- The layout collapses to one column under 760 px; the hand wraps instead of scrolling.
