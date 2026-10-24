import { randomInt } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@cardgame/protocol';

const ATTEMPTS = 20;

/** A fresh, unguessable room code that no open room uses. */
export function newRoomCode(taken: (code: string) => boolean): string {
  for (let i = 0; i < ATTEMPTS; i++) {
    const code = Array.from(
      { length: ROOM_CODE_LENGTH },
      () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
    ).join('');
    if (!taken(code)) return code;
  }
  throw new Error('Could not find a free room code.');
}
