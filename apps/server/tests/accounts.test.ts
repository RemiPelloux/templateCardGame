import { beforeEach, describe, expect, it } from 'vitest';
import type { Services } from '../src/core/feature';
import { PASSWORD, signUp, testServices } from './support';

let services: Services;
beforeEach(() => ({ services } = testServices()));

const login = (username: string, password = PASSWORD) =>
  services.accounts.login({ username, password, device: 'test' });

describe('registration', () => {
  it('creates an account with a tag, a session and eight recovery codes', async () => {
    const created = await services.accounts.register({
      username: 'Ada',
      password: PASSWORD,
      device: 'test',
    });
    expect(created.account.player).toMatchObject({ name: 'ada' });
    expect(created.account.player.tag).toBeGreaterThanOrEqual(1000);
    expect(created.codes).toHaveLength(8);
    expect(services.accounts.resolve(created.token)?.player.name).toBe('ada');
  });

  it('refuses taken usernames, bad usernames and short passwords', async () => {
    await signUp(services, 'ada');
    await expect(signUp(services, 'ADA')).rejects.toMatchObject({ code: 'USERNAME_TAKEN' });
    await expect(signUp(services, 'a!')).rejects.toMatchObject({ code: 'INVALID_USERNAME' });
    await expect(
      services.accounts.register({ username: 'bob', password: 'short', device: '' }),
    ).rejects.toMatchObject({
      code: 'INVALID_PASSWORD',
    });
  });
});

describe('signing in', () => {
  it('accepts the right password and refuses a wrong one the same way as an unknown user', async () => {
    await signUp(services, 'ada');
    expect((await login('ada')).account.player.name).toBe('ada');
    await expect(login('ada', 'wrong password')).rejects.toMatchObject({
      code: 'WRONG_CREDENTIALS',
    });
    await expect(login('nobody')).rejects.toMatchObject({ code: 'WRONG_CREDENTIALS' });
  });

  it('pauses a username after repeated failures', async () => {
    await signUp(services, 'ada');
    for (let i = 0; i < 10; i++) await login('ada', 'wrong password').catch(() => {});
    await expect(login('ada')).rejects.toMatchObject({ code: 'TOO_MANY_ATTEMPTS' });
  });
});

describe('recovery and settings', () => {
  it('resets a forgotten password with a single-use code', async () => {
    const { codes } = await services.accounts.register({
      username: 'ada',
      password: PASSWORD,
      device: 'test',
    });
    const recover = (code: string) =>
      services.accounts.recover({
        username: 'ada',
        code,
        password: 'brand new password',
        device: 'test',
      });
    await recover(codes[0]!.toLowerCase());
    await expect(login('ada')).rejects.toBeTruthy();
    expect((await login('ada', 'brand new password')).account.player.name).toBe('ada');
    await expect(recover(codes[0]!)).rejects.toMatchObject({ code: 'WRONG_RECOVERY' });
  });

  it('signs other devices out after a password change', async () => {
    const created = await services.accounts.register({
      username: 'ada',
      password: PASSWORD,
      device: 'a',
    });
    const other = await login('ada');
    await services.accounts.changePassword(created.account.player.id, {
      current: PASSWORD,
      next: 'another password',
      token: created.token,
    });
    expect(services.accounts.resolve(created.token)).not.toBeNull();
    expect(services.accounts.resolve(other.token)).toBeNull();
  });

  it('stores the language and finds players by handle', async () => {
    const ada = await signUp(services, 'ada');
    services.accounts.setLocale(ada.id, 'fr');
    expect((await login('ada')).account.locale).toBe('fr');
    expect(services.accounts.byHandle(`Ada#${ada.tag}`)).toEqual(ada);
    expect(() => services.accounts.setLocale(ada.id, 'xx')).toThrow();
  });

  it('deletes the account and what it owns, after confirming the password', async () => {
    const ada = await signUp(services, 'ada');
    services.wallet.credit(ada.id, { amount: 10, reason: 'test' });
    await expect(services.accounts.delete(ada.id, 'wrong password')).rejects.toMatchObject({
      code: 'WRONG_PASSWORD',
    });
    await services.accounts.delete(ada.id, PASSWORD);
    expect(services.accounts.player(ada.id)).toBeNull();
    expect(services.db.prepare('SELECT COUNT(*) AS n FROM coin_ledger').get()).toEqual({ n: 0 });
  });
});
