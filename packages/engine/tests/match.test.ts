import { describe, expect, it } from 'vitest';
import { act, createMatch, isRuleError, MAX_LOG, RuleError, viewMatch } from '../src';
import { raceGame, TARGET } from './fixtures/race-game';

const add = (amount: 1 | 2) => ({ type: 'add', amount });

describe('createMatch', () => {
  it('deals reproducibly from a seed', () => {
    const a = createMatch(raceGame, { players: 3, seed: 5 });
    const b = createMatch(raceGame, { players: 3, seed: 5 });
    expect(a.state).toEqual(b.state);
    expect(a.version).toBe(0);
  });

  it('refuses a player count the game does not allow', () => {
    expect(() => createMatch(raceGame, { players: 1 })).toThrow(RuleError);
    expect(() => createMatch(raceGame, { players: 5 })).toThrow(RuleError);
  });

  it('reads options through the game', () => {
    expect(createMatch(raceGame, { players: 2, options: { target: 3 } }).options).toEqual({
      target: 3,
    });
    expect(() => createMatch(raceGame, { players: 2, options: { target: 0 } })).toThrow(RuleError);
  });
});

describe('act', () => {
  it('applies a command to a copy and records it', () => {
    const before = createMatch(raceGame, { players: 2, seed: 1 });
    const after = act(raceGame, before, { seat: 0, command: add(2) });
    expect(after.state.total).toBe(2);
    expect(before.state.total).toBe(0);
    expect(after.version).toBe(1);
    expect(after.history).toEqual([{ seat: 0, command: add(2) }]);
  });

  it('refuses a seat that may not act', () => {
    const match = createMatch(raceGame, { players: 2, seed: 1 });
    const refused = (() => {
      try {
        act(raceGame, match, { seat: 1, command: add(1) });
      } catch (error) {
        return error;
      }
    })();
    expect(isRuleError(refused) && refused.code).toBe('NOT_YOUR_TURN');
  });

  it('refuses malformed commands before touching the state', () => {
    const match = createMatch(raceGame, { players: 2, seed: 1 });
    expect(() => act(raceGame, match, { seat: 0, command: { type: 'add', amount: 3 } })).toThrow(
      RuleError,
    );
    expect(() => act(raceGame, match, { seat: 0, command: 'add' })).toThrow(RuleError);
    expect(match.version).toBe(0);
  });

  it('ends the match and refuses further moves', () => {
    let match = createMatch(raceGame, { players: 2, seed: 1 });
    for (let i = 0; i < TARGET / 2; i++)
      match = act(raceGame, match, { seat: i % 2, command: add(2) });
    expect(match.outcome).toEqual({ winners: [0], reason: 'TARGET' });
    expect(() => act(raceGame, match, { seat: 1, command: add(1) })).toThrow(/over/);
  });

  it('keeps the log bounded while the history keeps everything', () => {
    let match = createMatch(raceGame, { players: 2, seed: 1, options: { target: 100 } });
    const moves = MAX_LOG;
    for (let i = 0; i < moves && !match.outcome; i++)
      match = act(raceGame, match, { seat: i % 2, command: add(1) });
    expect(match.log.length).toBeLessThanOrEqual(MAX_LOG);
    expect(match.history.length).toBe(match.version);
  });
});

describe('viewMatch', () => {
  it('shows each seat only its own secret and its own private log entries', () => {
    const match = act(raceGame, createMatch(raceGame, { players: 3, seed: 3 }), {
      seat: 0,
      command: add(1),
    });
    const mine = viewMatch(raceGame, match, 0);
    const theirs = viewMatch(raceGame, match, 1);
    expect(mine.state.secret).toBe(match.state.secrets[0]);
    expect(theirs.state.secret).toBe(match.state.secrets[1]);
    expect(mine.log.some((e) => e.event === 'secret')).toBe(true);
    expect(theirs.log.some((e) => e.event === 'secret')).toBe(false);
    expect(JSON.stringify(theirs)).not.toContain('"rng"');
  });

  it('lists legal commands only for the seat to act', () => {
    const match = createMatch(raceGame, { players: 2, seed: 1 });
    expect(viewMatch(raceGame, match, 0).legal).toHaveLength(2);
    expect(viewMatch(raceGame, match, 1).legal).toEqual([]);
    expect(viewMatch(raceGame, match, null).state.secret).toBeNull();
  });
});
