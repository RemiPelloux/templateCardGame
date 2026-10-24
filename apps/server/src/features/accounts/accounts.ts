import { randomInt, randomUUID } from 'node:crypto';
import { isLocale, type Locale } from '@cardgame/i18n';
import type { AccountOverview, Player } from '@cardgame/protocol';
import type { PasswordCost } from '../../core/config';
import type { Db } from '../../core/database';
import type { DomainEvents } from '../../core/events';
import type { Attempts } from '../../core/http/attempts';
import { ApiError } from '../../core/http/errors';
import { hashSecret, verifySecret } from './passwords';
import { normalizeCode, RECOVERY_CODE_COUNT, RecoveryCodes, validCode } from './recovery';
import { Sessions } from './sessions';
import { readPassword, readUsername } from './validation';

const TAG_MIN = 1000;
const TAG_MAX = 9999;
/** Failed sign-ins per username before a pause: slows guessing without locking anyone out long. */
const LOGIN_FAILURES = 10;
const RECOVERY_FAILURES = 5;
const FAILURE_WINDOW_MS = 15 * 60_000;

type Row = {
  id: string;
  username: string;
  tag: number;
  password: string;
  locale: string | null;
  created: number;
};
export type Account = { player: Player; locale: Locale | null };
type Deps = {
  db: Db;
  now: () => number;
  events: DomainEvents;
  attempts: Attempts;
  cost: PasswordCost;
};

const playerOf = (row: Pick<Row, 'id' | 'username' | 'tag'>): Player => ({
  id: row.id,
  name: row.username,
  tag: row.tag,
});
const wrongCredentials = () =>
  new ApiError('Wrong username or password.', 'WRONG_CREDENTIALS', 401);

/** Accounts with a username and a password: sign-up, sign-in, recovery, settings, deletion. */
export class Accounts {
  readonly sessions: Sessions;
  private codes: RecoveryCodes;

  constructor(private deps: Deps) {
    this.sessions = new Sessions(deps.db, deps.now);
    this.codes = new RecoveryCodes(deps.db, deps.cost, deps.now);
  }

  private row(where: 'id' | 'username', value: string) {
    return this.deps.db.prepare(`SELECT * FROM accounts WHERE ${where} = ?`).get(value) as
      Row | undefined;
  }

  isAvailable(username: string) {
    return !this.row('username', readUsername(username));
  }

  async register(input: { username: unknown; password: unknown; device: string }) {
    const username = readUsername(input.username);
    const hash = await hashSecret(readPassword(input.password), this.deps.cost);
    if (this.row('username', username))
      throw new ApiError('This username is taken.', 'USERNAME_TAKEN', 409);
    const row = {
      id: randomUUID(),
      username,
      tag: randomInt(TAG_MIN, TAG_MAX + 1),
      password: hash,
      locale: null,
      created: this.deps.now(),
    };
    this.deps.db
      .prepare('INSERT INTO accounts VALUES (?, ?, ?, ?, ?, ?)')
      .run(row.id, row.username, row.tag, row.password, row.locale, row.created);
    this.deps.events.emit('account.created', { accountId: row.id });
    const codes = await this.codes.generate(row.id);
    return {
      account: { player: playerOf(row), locale: null },
      token: this.sessions.create(row.id, input.device),
      codes,
    };
  }

  async login(input: { username: unknown; password: unknown; device: string }) {
    const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
    const key = `login:${username}`;
    this.deps.attempts.take(key, LOGIN_FAILURES, FAILURE_WINDOW_MS);
    const row = this.row('username', username);
    const { ok, stale } = await verifySecret(
      String(input.password ?? ''),
      row?.password,
      this.deps.cost,
    );
    if (!ok || !row) throw wrongCredentials();
    this.deps.attempts.clear(key);
    if (stale) await this.storePassword(row.id, String(input.password));
    return { account: this.account(row), token: this.sessions.create(row.id, input.device) };
  }

  /** A forgotten password reset with one recovery code; every other session is signed out. */
  async recover(input: { username: unknown; code: unknown; password: unknown; device: string }) {
    const username = typeof input.username === 'string' ? input.username.trim().toLowerCase() : '';
    const password = readPassword(input.password);
    this.deps.attempts.take(`recover:${username}`, RECOVERY_FAILURES, FAILURE_WINDOW_MS);
    const row = this.row('username', username);
    const code = normalizeCode(input.code);
    if (!validCode(code) || !(await this.codes.consume(row?.id, code)) || !row)
      throw new ApiError('Wrong username or recovery code.', 'WRONG_RECOVERY', 401);
    await this.storePassword(row.id, password);
    this.sessions.revokeOthers(row.id, undefined);
    return { account: this.account(row), token: this.sessions.create(row.id, input.device) };
  }

  /** The signed-in account behind a session token. */
  resolve(token: string | undefined): Account | null {
    const id = this.sessions.resolve(token);
    const row = id ? this.row('id', id) : undefined;
    return row ? this.account(row) : null;
  }

  player(id: string): Player | null {
    const row = this.row('id', id);
    return row ? playerOf(row) : null;
  }

  /** `name#1234` → the player, for friend requests and profile links. */
  byHandle(handle: string): Player | null {
    const [name, tag] = handle.toLowerCase().split('#');
    const row = this.deps.db
      .prepare('SELECT * FROM accounts WHERE username = ? AND tag = ?')
      .get(name ?? '', Number(tag)) as Row | undefined;
    return row ? playerOf(row) : null;
  }

  async changePassword(id: string, input: { current: unknown; next: unknown; token?: string }) {
    const next = readPassword(input.next);
    await this.confirm(id, input.current);
    await this.storePassword(id, next);
    this.sessions.revokeOthers(id, input.token);
  }

  async regenerateCodes(id: string, password: unknown) {
    await this.confirm(id, password);
    return this.codes.generate(id);
  }

  setLocale(id: string, locale: unknown) {
    if (!isLocale(locale)) throw new ApiError('Unknown language.', 'INVALID_LOCALE');
    this.deps.db.prepare('UPDATE accounts SET locale = ? WHERE id = ?').run(locale, id);
  }

  overview(id: string, token: string | undefined): AccountOverview {
    const row = this.row('id', id)!;
    return {
      player: playerOf(row),
      created: row.created,
      recovery: { remaining: this.codes.remaining(id), total: RECOVERY_CODE_COUNT },
      sessions: this.sessions.list(id, token),
    };
  }

  /** Deletes the account and, through foreign keys and `account.deleted`, everything it owns. */
  async delete(id: string, password: unknown) {
    await this.confirm(id, password);
    this.deps.events.emit('account.deleted', { accountId: id });
    this.deps.db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
  }

  /** Sensitive actions ask for the password again. */
  private async confirm(id: string, password: unknown) {
    const key = `confirm:${id}`;
    this.deps.attempts.take(key, LOGIN_FAILURES, FAILURE_WINDOW_MS);
    const { ok } = await verifySecret(
      String(password ?? ''),
      this.row('id', id)?.password,
      this.deps.cost,
    );
    if (!ok) throw new ApiError('Wrong password.', 'WRONG_PASSWORD', 403);
    this.deps.attempts.clear(key);
  }

  private async storePassword(id: string, password: string) {
    const hash = await hashSecret(password, this.deps.cost);
    this.deps.db.prepare('UPDATE accounts SET password = ? WHERE id = ?').run(hash, id);
  }

  private account(row: Row): Account {
    return { player: playerOf(row), locale: isLocale(row.locale) ? row.locale : null };
  }
}
