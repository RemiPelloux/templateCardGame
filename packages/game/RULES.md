# Crazy Eights: rules

> This file doubles as the template for your own rules. Keep its sections, rewrite their
> content, and give every rule a test in `tests/rules.test.ts`. Numbers live in
> `src/constants.ts`.

## Components

One standard 52-card deck. 2 to 6 players.

## Setup

1. Shuffle. Deal **7 cards** each to two players, **5** each with more (option `handSize`, 1–8).
2. Turn the top card of the deck face up: it starts the discard pile. If it is an eight, bury it
   at a random place in the deck and turn the next card.
3. The suit to follow is the starter's suit. Seat 0 plays first, then play goes clockwise.

## A turn

The player to move does exactly one of:

- **Play** a card that matches the **suit to follow** or the **rank** of the top card. It becomes
  the top card and its suit becomes the suit to follow.
- **Play an eight**, on anything, and **name a suit**: it becomes the suit to follow.
- **Draw** one card, if they have not drawn yet this turn. Then they may play any playable
  card (the drawn one included) or **pass**. A player may draw even when they could play.

Passing is only allowed after drawing, or when nothing is left to draw.

## The deck runs out

When the deck is empty, the discard pile except its top card is shuffled into a new deck. When
there is nothing left to draw at all, players who cannot (or will not) play pass.

## End of the game

- **Empty hand**: the first player to play their last card wins at once.
- **Blocked**: if nothing can be drawn and every player passes in a row, the game ends; the
  player with the fewest penalty points in hand wins (ties share the win).

## Scoring

Each winner scores the penalty points left in the other hands: eight **50**, king, queen or jack
**10**, ace **1**, other cards their face value.

## Edge cases

| Situation                         | Ruling                                         |
| --------------------------------- | ---------------------------------------------- |
| An eight is turned as the starter | Buried in the deck, next card turned           |
| Eight played without a suit       | Refused (`SUIT_REQUIRED`)                      |
| Second draw in a turn             | Refused (`ALREADY_DRAWN`)                      |
| Pass before drawing               | Refused while cards can be drawn (`MUST_DRAW`) |
| A player leaves an online match   | A bot takes the seat and plays on              |
