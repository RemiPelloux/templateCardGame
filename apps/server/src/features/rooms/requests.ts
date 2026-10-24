import { readInteger, readOneOf, readOptional, readRecord, readString } from '@cardgame/engine';
import type { CommandRequest, SeatsRequest, StartRequest } from '@cardgame/protocol';
import type { Command } from '@cardgame/game';

/** Readers for request bodies: shapes only. The game validates commands and options itself. */
const MAX_SEAT = 64;
const MAX_REVISION = Number.MAX_SAFE_INTEGER;
const BOT_ID_LENGTH = 32;

export function seatsRequest(body: Record<string, unknown>): SeatsRequest {
  const action = readOneOf(body.action, ['addBot', 'removeBot'] as const, 'action');
  if (action === 'removeBot')
    return { action, seat: readInteger(body.seat, 'seat', { min: 0, max: MAX_SEAT }) };
  const bot = readOptional(body.bot, (v) => readString(v, 'bot', BOT_ID_LENGTH));
  return bot ? { action, bot } : { action };
}

export function startRequest(body: Record<string, unknown>): StartRequest {
  const options = readOptional(body.options, (v) => readRecord(v, 'options'));
  return options ? { options } : {};
}

/** The command stays untrusted here: `act` hands it to the game's own parseCommand. */
export function commandRequest(body: Record<string, unknown>): CommandRequest {
  const revision = readInteger(body.revision, 'revision', { min: 0, max: MAX_REVISION });
  return { revision, command: body.command as Command };
}
