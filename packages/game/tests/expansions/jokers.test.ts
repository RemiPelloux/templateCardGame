import { describe, expect, it } from 'vitest';
import { act, checkConformance, createMatch, RuleError, simulate } from '@cardgame/engine';
import { basicBot, bots, game, type Card, type State, type View } from '../../src';
import { card, cards } from '../helpers';

const JOKERS = { expansion: 'jokers' };
const DECK_SIZE = 54;
/** Conformance checks thousands of positions: more than vitest's default 5 s on a busy machine. */
const SLOW_MS = 60_000;
const DUEL_GAMES = 200;
const DUEL_EDGE = 0.5;

const joker = (n = 1): Card => ({ id: `JK${n}`, special: 'joker' });
const play = (cardId: string, suit?: string) => ({
  type: 'play',
  cardId,
  ...(suit ? { suit } : {}),
});

/** A Jokers & Tricks match whose state is replaced by a hand-written position. */
function position(state: Partial<State> & Pick<State, 'hands'>) {
  const match = createMatch(game, { players: state.hands.length, seed: 1, options: JOKERS });
  const top = state.discard?.at(-1) ?? card('5S');
  match.state = {
    ...match.state,
    deck: [],
    discard: [top],
    suit: 'suit' in top ? top.suit : 'spades',
    turn: 0,
    drawn: false,
    blockedPasses: 0,
    ...state,
  };
  return match;
}

describe('jokers: setup', () => {
  it('records the expansion and its rules version, and adds two jokers', () => {
    const match = createMatch(game, { players: 3, seed: 2, options: JOKERS });
    expect(match.options).toMatchObject({ expansion: 'jokers', expansionRules: 1 });
    expect(match.state.expansion).toEqual({ id: 'jokers', rulesVersion: 1 });
    const all = [...match.state.hands.flat(), ...match.state.deck, ...match.state.discard];
    expect(all).toHaveLength(DECK_SIZE);
    expect(all.filter((c) => 'special' in c).map((c) => c.id)).toEqual(
      expect.arrayContaining(['JK1', 'JK2']),
    );
  });

  it('never starts on a joker or an eight', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const top = createMatch(game, { players: 4, seed, options: JOKERS }).state.discard[0]!;
      expect('rank' in top && top.rank !== '8').toBe(true);
    }
  });

  it('refuses unknown expansions and rules it no longer plays', () => {
    expect(() => game.parseOptions({ expansion: 'nope' })).toThrow(RuleError);
    expect(() => game.parseOptions({ expansion: 'jokers', expansionRules: 99 })).toThrow(
      /no longer/,
    );
    expect(game.parseOptions({})).toEqual(game.defaultOptions);
  });
});

describe('jokers: the joker', () => {
  const start = () =>
    position({
      hands: [[joker(), ...cards('3H')], cards('4C'), cards('6D')],
      discard: cards('5S'),
      deck: cards('9H 10H KD'),
    });

  it('is wild: it goes on anything, with a named suit', () => {
    expect(() => act(game, start(), { seat: 0, command: play('JK1') })).toThrow(/suit/);
    const after = act(game, start(), { seat: 0, command: play('JK1', 'hearts') });
    expect(after.state.suit).toBe('hearts');
  });

  it('makes the next player draw two cards and miss their turn', () => {
    const after = act(game, start(), { seat: 0, command: play('JK1', 'hearts') });
    expect(after.state.hands[1]!.map((c) => c.id)).toEqual(['4C', 'KD', '10H']);
    expect(after.state.turn).toBe(2);
    expect(after.log.map((e) => e.event)).toContain('forcedDraw');
  });

  it('draws only what is left: here the reshuffled 5♠', () => {
    const match = start();
    match.state.deck = [];
    const after = act(game, match, { seat: 0, command: play('JK1', 'hearts') });
    expect(after.state.hands[1]).toHaveLength(2);
    expect(after.state.turn).toBe(2);
  });

  it('is worth 50 points in hand', () => {
    const match = position({ hands: [cards('5H'), [joker(), card('2C')]], discard: cards('5S') });
    const over = act(game, match, { seat: 0, command: play('5H') });
    expect(over.outcome?.scores).toEqual([52, 0]);
  });
});

describe('jokers: tricks', () => {
  const three = (hand: string) =>
    position({ hands: [cards(hand), cards('4C'), cards('7S 6D')], discard: cards('5S') });

  it('a jack makes the next player miss their turn', () => {
    const after = act(game, three('JS 2H'), { seat: 0, command: play('JS') });
    expect(after.state.turn).toBe(2);
  });

  it('a queen reverses the direction of play', () => {
    const after = act(game, three('QS 2H'), { seat: 0, command: play('QS') });
    expect(after.state.turn).toBe(2);
    expect(after.state.expansionState).toEqual({ direction: -1 });
    const next = act(game, after, { seat: 2, command: play('7S') });
    expect(next.state.turn).toBe(1);
  });

  it('with two players, a jack or a queen gives the turn back', () => {
    for (const trick of ['JS', 'QS']) {
      const match = position({ hands: [cards(`${trick} 2H`), cards('4C')], discard: cards('5S') });
      expect(act(game, match, { seat: 0, command: play(trick) }).state.turn).toBe(0);
    }
  });

  it('a trick played as the last card just wins', () => {
    const over = act(game, three('JS'), { seat: 0, command: play('JS') });
    expect(over.outcome?.winners).toEqual([0]);
  });

  it('shows the direction to every seat', () => {
    const after = act(game, three('QS 2H'), { seat: 0, command: play('QS') });
    expect(game.view(after.state, 1).expansionView).toEqual({ direction: -1 });
    expect(game.view(after.state, null).expansion).toEqual({ id: 'jokers', rulesVersion: 1 });
  });
});

/** No card is ever lost or duplicated: 52 plus the two jokers. */
function cardsConserved(state: State) {
  const ids = [...state.hands.flat(), ...state.deck, ...state.discard].map((c) => c.id);
  if (ids.length !== DECK_SIZE || new Set(ids).size !== DECK_SIZE)
    throw new Error('cards were lost or duplicated');
}

/** A seat sees its own hand and nothing of anyone else's, nor the deck. */
function handsSecret(view: View, state: State, seat: number) {
  const visible = new Set(view.hand.map((c) => c.id));
  const others = state.hands.flatMap((hand, i) => (i === seat ? [] : hand));
  if (others.some((c) => visible.has(c.id)) || JSON.stringify(view).includes('"deck"'))
    throw new Error('a view reveals hidden cards');
}

const withJokers = { ...game, defaultOptions: game.parseOptions(JOKERS) };

describe('jokers: conformance', () => {
  it(
    'plays random games at every table size by the contract',
    () => {
      const report = checkConformance(withJokers, {
        invariant: cardsConserved,
        secrecy: handsSecret,
      });
      expect(report.games).toBeGreaterThan(0);
    },
    SLOW_MS,
  );

  it(
    'plays well-formed games with the basic bot',
    () => {
      const report = checkConformance(withJokers, { bot: basicBot, invariant: cardsConserved });
      expect(report.moves).toBeGreaterThan(0);
    },
    SLOW_MS,
  );

  it('gives the basic bot an edge over random play', () => {
    let wins = 0;
    for (let seed = 1; seed <= DUEL_GAMES; seed++) {
      const match = simulate(withJokers, {
        players: 2,
        seed,
        bots: (seat) => (seat === 0 ? basicBot : bots.random!),
      });
      if (match.outcome!.winners.includes(0)) wins++;
    }
    expect(wins / DUEL_GAMES).toBeGreaterThan(DUEL_EDGE);
  });
});
