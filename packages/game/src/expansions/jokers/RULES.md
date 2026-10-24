# Jokers & Tricks: rules

> An expansion of [Crazy Eights](../../../RULES.md). Everything not written here plays as in the
> base game. Numbers live in `constants.ts`; each rule has a test in
> `tests/expansions/jokers.test.ts`. Rules version **1**.

## Components

The base deck plus **two Jokers**: 54 cards. 2 to 6 players.

## Setup

As in the base game. A Joker turned up as the starter is buried in the deck, like an eight.
Play starts **clockwise**. A jack or a queen turned up as the starter has no effect.

## New cards

| Card      | When played                                                                    |
| --------- | ------------------------------------------------------------------------------ |
| **Joker** | Wild, like an eight: goes on anything and names the suit to follow. The next   |
|           | player **draws two cards** and **misses their turn**.                          |
| **Jack**  | The next player **misses their turn**.                                         |
| **Queen** | **Reverses** the direction of play. With two players it works like a jack: the |
|           | player who laid it plays again.                                                |

Eights stay wild. Jacks and queens still follow the suit or the rank like any card.

## Scoring

A Joker left in hand is worth **50** points to the winner, like an eight.

## Edge cases

| Situation                                       | Ruling                                               |
| ----------------------------------------------- | ---------------------------------------------------- |
| A Joker when fewer than two cards can be drawn  | The next player draws what is left, and still misses |
| A trick card played as the last card            | The game ends at once: the effect does not apply     |
| A Joker played on a Joker                       | Allowed (wild); penalties do not stack or pass on    |
| A saved match dealt with an older rules version | Played by its own version while the code supports it |
