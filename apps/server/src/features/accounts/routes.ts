import type { IncomingMessage, ServerResponse } from 'node:http';
import { accountApi, type RegisterResponse, type SessionResponse } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { unauthorized } from '../../core/http/errors';
import { readCookie } from '../../core/http/io';
import { clientAddress } from '../../core/http/policy';
import type { Router } from '../../core/http/router';
import type { Account } from './accounts';
import { SESSION_COOKIE, sessionCookie } from './sessions';
import { deviceOf } from './validation';

/** Requests per minute and address: generous for people, tight for scripts. */
const LIMITS = { register: 5, login: 30, reads: 120 };
const RELAXED = 10_000;

const session = (account: Account): SessionResponse => ({
  player: account.player,
  locale: account.locale,
});

export function accountRoutes(router: Router, { accounts, config, limit }: Services) {
  const perIp = (req: IncomingMessage, name: keyof typeof LIMITS) =>
    limit(`${name}:${clientAddress(req, config)}`, config.relaxedLimits ? RELAXED : LIMITS[name]);
  const signIn = (res: ServerResponse, token: string) =>
    res.setHeader('Set-Cookie', sessionCookie(token, config.production));
  const device = (req: IncomingMessage) => deviceOf(req.headers['user-agent']);
  const token = (req: IncomingMessage) => readCookie(req, SESSION_COOKIE);

  router
    .on('GET', accountApi.session, ({ req }) => {
      const account = accounts.resolve(token(req));
      if (!account) throw unauthorized();
      return session(account);
    })
    .on('GET', accountApi.availability(':username'), ({ req, params }) => {
      perIp(req, 'reads');
      return { available: accounts.isAvailable(params[0] ?? '') };
    })
    .on('POST', accountApi.register, async ({ req, res, body }) => {
      perIp(req, 'register');
      const input = await body();
      const created = await accounts.register({
        username: input.username,
        password: input.password,
        device: device(req),
      });
      signIn(res, created.token);
      return { ...session(created.account), codes: created.codes } satisfies RegisterResponse;
    })
    .on('POST', accountApi.login, async ({ req, res, body }) => {
      perIp(req, 'login');
      const input = await body();
      const signed = await accounts.login({
        username: input.username,
        password: input.password,
        device: device(req),
      });
      signIn(res, signed.token);
      return session(signed.account);
    })
    .on('POST', accountApi.recover, async ({ req, res, body }) => {
      perIp(req, 'login');
      const input = await body();
      const signed = await accounts.recover({
        username: input.username,
        code: input.code,
        password: input.password,
        device: device(req),
      });
      signIn(res, signed.token);
      return session(signed.account);
    })
    .on('POST', accountApi.logout, ({ req, res }) => {
      accounts.sessions.revoke(token(req));
      res.setHeader('Set-Cookie', sessionCookie('', config.production, 0));
    })
    .on('GET', accountApi.account, ({ req, me }) => accounts.overview(me().id, token(req)))
    .on('POST', accountApi.password, async ({ req, me, body }) => {
      const input = await body();
      await accounts.changePassword(me().id, {
        current: input.current,
        next: input.next,
        token: token(req),
      });
    })
    .on('POST', accountApi.locale, async ({ me, body }) => {
      accounts.setLocale(me().id, (await body()).locale);
    })
    .on('POST', accountApi.recoveryCodes, async ({ me, body }) => ({
      codes: await accounts.regenerateCodes(me().id, (await body()).password),
    }))
    .on('DELETE', accountApi.session_(':id'), ({ me, params }) => {
      accounts.sessions.revokeById(me().id, params[0] ?? '');
    })
    .on('POST', accountApi.deleteAccount, async ({ res, me, body }) => {
      await accounts.delete(me().id, (await body()).password);
      res.setHeader('Set-Cookie', sessionCookie('', config.production, 0));
    });
}
