import { describe, expect, it } from 'vitest';
import {
  botCommand,
  checkConformance,
  createMatch,
  greedyBot,
  isReproducible,
  randomBot,
  replay,
  simulate,
} from '../src';
import { raceGame, type RaceCommand, type RaceView } from './fixtures/race-game';

const bigSteps = greedyBot<RaceView, RaceCommand>('big', (command) => command.amount);

describe('bots', () => {
  it('choose from the seat view, deterministically', () => {
    const match = createMatch(raceGame, { players: 2, seed: 11 });
    const bot = randomBot<RaceView, RaceCommand>();
    const first = botCommand(raceGame, match, { seat: 0, bot });
    expect(botCommand(raceGame, match, { seat: 0, bot })).toEqual(first);
  });

  it('greedy bots take the best scored command', () => {
    const match = createMatch(raceGame, { players: 2, seed: 1 });
    expect(botCommand(raceGame, match, { seat: 0, bot: bigSteps })).toEqual({
      type: 'add',
      amount: 2,
    });
  });
});

describe('simulate and replay', () => {
  it('plays a match to the end and replays it exactly', () => {
    const match = simulate(raceGame, { players: 3, seed: 8, bots: randomBot() });
    expect(match.outcome).not.toBeNull();
    expect(replay(raceGame, match).state).toEqual(match.state);
    expect(isReproducible(raceGame, match)).toBe(true);
  });

  it('stops a match that never ends', () => {
    expect(() =>
      simulate(raceGame, { players: 2, seed: 1, bots: randomBot(), maxMoves: 2 }),
    ).toThrow(/no outcome/);
  });
});

describe('checkConformance', () => {
  it('passes a well-behaved game', () => {
    const report = checkConformance(raceGame, { games: 10 });
    expect(report.games).toBe(30);
    expect(report.wins.reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('catches a view that leaks a secret', () => {
    const leaky = {
      ...raceGame,
      view: (state: Parameters<typeof raceGame.view>[0]) => ({
        ...raceGame.view(state, 0),
        secret: state.secrets[1]!,
      }),
    };
    expect(() =>
      checkConformance(leaky, {
        games: 1,
        secrecy: (view, state, seat) => {
          if (view.secret !== state.secrets[seat]) throw new Error('leak');
        },
      }),
    ).toThrow(/leak/);
  });

  it('catches legal commands that apply refuses', () => {
    const lying = {
      ...raceGame,
      legalCommands: () => [{ type: 'add', amount: 3 } as unknown as RaceCommand],
    };
    expect(() => checkConformance(lying, { games: 1 })).toThrow();
  });
});
