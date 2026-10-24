import { describe, expect, it } from 'vitest';
import { cleanName, Sessions, SESSION_DAYS } from '../src/identity/sessions';
import { openDatabase } from '../src/storage/database';

const DAY_MS = 86_400_000;

describe('sessions', () => {
  it('cleans names and refuses empty, long or control-character names', () => {
    expect(cleanName('  Ada   Lovelace ')).toBe('Ada Lovelace');
    expect(() => cleanName('')).toThrow();
    expect(() => cleanName('x'.repeat(25))).toThrow();
    expect(() => cleanName('a\u0000b')).toThrow();
  });

  it('resolves a token to its player until revoked or expired', () => {
    const clock = { now: 0 };
    const sessions = new Sessions(openDatabase(':memory:'), () => clock.now);
    const { token, player } = sessions.create('Ada');
    expect(sessions.resolve(token)).toEqual(player);
    expect(sessions.resolve('forged')).toBeNull();
    clock.now += (SESSION_DAYS + 1) * DAY_MS;
    expect(sessions.resolve(token)).toBeNull();
    const again = sessions.create('Ada');
    sessions.revoke(again.token);
    expect(sessions.resolve(again.token)).toBeNull();
  });
});
