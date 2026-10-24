import { readInteger, readRecord, RuleError, type GameDefinition, type Seat } from '../../src';

/**
 * A tiny game for engine tests: players take turns adding 1 or 2 to a counter, whoever reaches
 * the target wins. Each player also holds a secret number nobody else may see.
 */
export type RaceState = { total: number; turn: Seat; secrets: number[] };
export type RaceCommand = { type: 'add'; amount: 1 | 2 };
export type RaceView = { total: number; turn: Seat; secret: number | null; others: number };

export const TARGET = 10;
const SECRET_RANGE = 100;

export const raceGame: GameDefinition<RaceState, RaceCommand, RaceView, { target: number }> = {
  id: 'race',
  name: 'Race',
  rulesVersion: 1,
  players: { min: 2, max: 4 },
  defaultOptions: { target: TARGET },
  parseOptions: (input) => ({
    target: readInteger(readRecord(input, 'options').target, 'target', { min: 1, max: 100 }),
  }),
  setup: ({ players, rng, log }) => {
    log('start');
    return {
      total: 0,
      turn: 0,
      secrets: Array.from({ length: players }, () => rng.int(SECRET_RANGE)),
    };
  },
  actors: (state) => [state.turn],
  parseCommand: (input) => {
    const raw = readRecord(input);
    if (raw.type !== 'add') throw new RuleError('Unknown command.', 'INVALID_INPUT');
    return { type: 'add', amount: readInteger(raw.amount, 'amount', { min: 1, max: 2 }) as 1 | 2 };
  },
  apply: (state, command, ctx) => {
    if (state.total >= TARGET) throw new RuleError('Over.');
    state.total += command.amount;
    ctx.log('add', { amount: command.amount });
    ctx.log('secret', { value: state.secrets[ctx.seat] }, { visibleTo: [ctx.seat] });
    state.turn = (state.turn + 1) % state.secrets.length;
  },
  legalCommands: (state, seat) =>
    seat === state.turn
      ? [
          { type: 'add', amount: 1 },
          { type: 'add', amount: 2 },
        ]
      : [],
  outcome: (state) => {
    if (state.total < TARGET) return null;
    const winner = (state.turn + state.secrets.length - 1) % state.secrets.length;
    return { winners: [winner], reason: 'TARGET' };
  },
  view: (state, seat) => ({
    total: state.total,
    turn: state.turn,
    secret: seat === null ? null : state.secrets[seat]!,
    others: state.secrets.length - 1,
  }),
};
