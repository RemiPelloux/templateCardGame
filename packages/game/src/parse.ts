import {
  isSuit,
  readInteger,
  readOneOf,
  readOptional,
  readRecord,
  readString,
  RuleError,
  type Suit,
} from '@cardgame/engine';
import { MAX_HAND_SIZE, MIN_HAND_SIZE } from './constants';
import type { Command, Options } from './types';

const COMMAND_TYPES = ['play', 'draw', 'pass'] as const;
const CARD_ID_LENGTH = 8;

function readSuit(value: unknown): Suit {
  if (!isSuit(value)) throw new RuleError('Invalid suit.', 'INVALID_INPUT');
  return value;
}

/** Untrusted JSON from a client into a typed command. Legality is `apply`'s job, not this one's. */
export function parseCommand(input: unknown): Command {
  const raw = readRecord(input);
  const type = readOneOf(raw.type, COMMAND_TYPES, 'command type');
  if (type !== 'play') return { type };
  const cardId = readString(raw.cardId, 'card', CARD_ID_LENGTH);
  const suit = readOptional(raw.suit, readSuit);
  return suit ? { type, cardId, suit } : { type, cardId };
}

export function parseOptions(input: unknown): Options {
  const raw = readRecord(input, 'options');
  const range = { min: MIN_HAND_SIZE, max: MAX_HAND_SIZE };
  const handSize =
    raw.handSize === null
      ? null
      : readOptional(raw.handSize, (v) => readInteger(v, 'hand size', range));
  return { handSize: handSize ?? null };
}
