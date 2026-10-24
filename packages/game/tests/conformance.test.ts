import { describe, expect, it } from 'vitest';
import { checkConformance, simulate } from '@cardgame/engine';
import { basicBot, bots, game, type State, type View } from '../src';

const DECK_SIZE = 52;
/** Conformance checks thousands of positions: more than vitest's default 5 s on a busy machine. */
const SLOW_MS = 60_000;
const DUEL_GAMES = 200;
const DUEL_EDGE = 0.5;

/** No card is ever lost or duplicated. */
function cardsConserved(state: State) {
  const ids = [...state.hands.flat(), ...state.deck, ...state.discard].map((c) => c.id);
  if (ids.length !== DECK_SIZE || new Set(ids).size !== DECK_SIZE)
    throw new Error('cards were lost or duplicated');
}

/** A seat sees its own hand and nothing of anyone else's. */
function handsSecret(view: View, state: State, seat: number) {
  const visible = new Set(view.hand.map((c) => c.id));
  const others = state.hands.flatMap((hand, i) => (i === seat ? [] : hand));
  if (others.some((c) => visible.has(c.id)) || JSON.stringify(view).includes('"deck"'))
    throw new Error('a view reveals hidden cards');
}

describe('Crazy Eights conformance', () => {
  it(
    'plays random games at every table size by the contract',
    () => {
      const report = checkConformance(game, { invariant: cardsConserved, secrecy: handsSecret });
      expect(report.games).toBeGreaterThan(0);
    },
    SLOW_MS,
  );

  it(
    'plays well-formed games with the basic bot',
    () => {
      const report = checkConformance(game, { bot: basicBot, invariant: cardsConserved });
      expect(report.moves).toBeGreaterThan(0);
    },
    SLOW_MS,
  );

  it('gives the basic bot an edge over random play', () => {
    let wins = 0;
    for (let seed = 1; seed <= DUEL_GAMES; seed++) {
      const match = simulate(game, {
        players: 2,
        seed,
        bots: (seat) => (seat === 0 ? basicBot : bots.random!),
      });
      if (match.outcome!.winners.includes(0)) wins++;
    }
    expect(wins / DUEL_GAMES).toBeGreaterThan(DUEL_EDGE);
  });
});
