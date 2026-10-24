import { describe, expect, it } from 'vitest';
import { act, createMatch, RuleError } from '@cardgame/engine';
import { game } from '../src';
import { cards, position } from './helpers';

const play = (cardId: string, suit?: string) => ({
  type: 'play',
  cardId,
  ...(suit ? { suit } : {}),
});

describe('setup', () => {
  it('deals 7 cards each to two players and 5 to more', () => {
    expect(createMatch(game, { players: 2, seed: 1 }).state.hands.map((h) => h.length)).toEqual([
      7, 7,
    ]);
    expect(createMatch(game, { players: 4, seed: 1 }).state.hands.map((h) => h.length)).toEqual([
      5, 5, 5, 5,
    ]);
    expect(
      createMatch(game, { players: 3, seed: 1, options: { handSize: 3 } }).state.hands[0],
    ).toHaveLength(3);
  });

  it('never starts on an eight, and keeps all 52 cards', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { state } = createMatch(game, { players: 4, seed });
      expect(state.discard[0]!.rank).not.toBe('8');
      expect(state.hands.flat().length + state.deck.length + state.discard.length).toBe(52);
    }
  });
});

describe('playing a card', () => {
  const start = () =>
    position({ hands: [cards('5H KS 8C 2D'), cards('3C 4C')], discard: cards('5S') });

  it('follows the suit or the rank, then passes the turn', () => {
    const afterRank = act(game, start(), { seat: 0, command: play('5H') });
    expect(afterRank.state.suit).toBe('hearts');
    expect(afterRank.state.turn).toBe(1);
    expect(act(game, start(), { seat: 0, command: play('KS') }).state.suit).toBe('spades');
  });

  it('refuses a card that matches nothing', () => {
    expect(() => act(game, start(), { seat: 0, command: play('2D') })).toThrow(RuleError);
  });

  it('lets an eight go on anything, but only with a named suit', () => {
    expect(() => act(game, start(), { seat: 0, command: play('8C') })).toThrow(/suit/);
    expect(act(game, start(), { seat: 0, command: play('8C', 'diamonds') }).state.suit).toBe(
      'diamonds',
    );
  });

  it('refuses a card from someone else’s hand', () => {
    expect(() => act(game, start(), { seat: 0, command: play('3C') })).toThrow(RuleError);
  });

  it('wins by playing the last card, scoring what is left elsewhere', () => {
    const match = position({ hands: [cards('5H'), cards('8C KD 3S')], discard: cards('5S') });
    const over = act(game, match, { seat: 0, command: play('5H') });
    expect(over.outcome).toEqual({ winners: [0], scores: [63, 0], reason: 'EMPTY_HAND' });
  });
});

describe('drawing and passing', () => {
  it('draws once, then plays or passes', () => {
    const match = position({
      hands: [cards('2D'), cards('3C')],
      discard: cards('5S'),
      deck: cards('9H 6S'),
    });
    const drawn = act(game, match, { seat: 0, command: { type: 'draw' } });
    expect(drawn.state.hands[0]!.map((c) => c.id)).toEqual(['2D', '6S']);
    expect(() => act(game, drawn, { seat: 0, command: { type: 'draw' } })).toThrow(/already/);
    expect(act(game, drawn, { seat: 0, command: { type: 'pass' } }).state.turn).toBe(1);
  });

  it('refuses to pass before drawing while cards remain', () => {
    const match = position({
      hands: [cards('2D'), cards('3C')],
      discard: cards('5S'),
      deck: cards('9H'),
    });
    expect(() => act(game, match, { seat: 0, command: { type: 'pass' } })).toThrow(/Draw/);
  });

  it('shuffles the discard pile back when the deck runs out, keeping the top card', () => {
    const match = position({ hands: [cards('2D'), cards('3C')], discard: cards('9H 4C 5S') });
    const drawn = act(game, match, { seat: 0, command: { type: 'draw' } });
    expect(drawn.state.discard.map((c) => c.id)).toEqual(['5S']);
    expect(drawn.state.deck.length + 1).toBe(2);
  });

  it('ends a blocked game once everyone has passed, lightest hand winning', () => {
    let match = position({ hands: [cards('2D'), cards('KD')], discard: cards('5S') });
    match = act(game, match, { seat: 0, command: { type: 'pass' } });
    match = act(game, match, { seat: 1, command: { type: 'pass' } });
    expect(match.outcome).toMatchObject({ winners: [0], reason: 'BLOCKED' });
  });
});

describe('views', () => {
  it('show your hand and only the size of the others', () => {
    const match = createMatch(game, { players: 3, seed: 4 });
    const view = game.view(match.state, 1);
    expect(view.hand).toEqual(match.state.hands[1]);
    expect(view.handCounts).toEqual([5, 5, 5]);
    expect(JSON.stringify(view)).not.toContain(match.state.hands[0]![0]!.id + '"');
    expect(game.view(match.state, null).hand).toEqual([]);
  });
});
