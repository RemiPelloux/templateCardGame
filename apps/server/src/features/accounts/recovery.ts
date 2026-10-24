import { randomInt } from 'node:crypto';
import type { PasswordCost } from '../../core/config';
import type { Db } from '../../core/database';
import { hashSecret, verifySecret } from './passwords';

/** Codes handed out at a time; regenerating replaces the whole set. */
export const RECOVERY_CODE_COUNT = 8;
/** No 0/O or 1/I/L to misread on paper: 31 symbols. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const GROUPS = 3;
const GROUP_LENGTH = 4;
const CODE_LENGTH = GROUPS * GROUP_LENGTH;
/**
 * The first group is stored in clear to find the one row to check, so an attempt costs one
 * derivation, not eight. The whole code (about 59 bits) is hashed like a password.
 */
const SELECTOR_LENGTH = GROUP_LENGTH;

const randomCode = () =>
  Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
/** `ABCD-EFGH-JKMN` as shown; spaces, dashes and case are ignored when typed back. */
const display = (code: string) => code.match(new RegExp(`.{${GROUP_LENGTH}}`, 'g'))!.join('-');
export const normalizeCode = (value: unknown) =>
  typeof value === 'string' ? value.toUpperCase().replace(/[\s-]/g, '') : '';
export const validCode = (code: string) =>
  code.length === CODE_LENGTH && [...code].every((c) => ALPHABET.includes(c));

/** Single-use codes that reset a forgotten password: the template's account recovery. */
export class RecoveryCodes {
  constructor(
    private db: Db,
    private cost: PasswordCost,
    private now: () => number,
  ) {}

  remaining(accountId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS n FROM recovery_codes WHERE account_id = ?')
      .get(accountId) as { n: number };
    return row.n;
  }

  /** A fresh set, returned once in clear and stored hashed; the old set is replaced. */
  async generate(accountId: string): Promise<string[]> {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, randomCode);
    const hashes: string[] = [];
    // One after the other: eight derivations at once would hold 1 GiB.
    for (const code of codes) hashes.push(await hashSecret(code, this.cost));
    const insert = this.db.prepare('INSERT INTO recovery_codes VALUES (?, ?, ?, ?)');
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM recovery_codes WHERE account_id = ?').run(accountId);
      codes.forEach((code, i) =>
        insert.run(accountId, code.slice(0, SELECTOR_LENGTH), hashes[i], this.now()),
      );
    })();
    return codes.map(display);
  }

  /** Uses up the matching code; false when none matches (or a concurrent request used it). */
  async consume(accountId: string | undefined, code: string): Promise<boolean> {
    const rows = this.db
      .prepare('SELECT rowid AS id, hash FROM recovery_codes WHERE account_id = ? AND selector = ?')
      .all(accountId ?? '', code.slice(0, SELECTOR_LENGTH)) as { id: number; hash: string }[];
    if (!rows.length) await verifySecret(code, undefined, this.cost);
    for (const row of rows)
      if ((await verifySecret(code, row.hash, this.cost)).ok)
        return (
          this.db.prepare('DELETE FROM recovery_codes WHERE rowid = ?').run(row.id).changes === 1
        );
    return false;
  }
}
