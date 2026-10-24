import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { PasswordCost } from '../../core/config';
import { ApiError } from '../../core/http/errors';

const BLOCK_BYTES = 128;
/** scrypt needs 128 × N × r bytes; Node refuses anything above maxmem, so leave room. */
const MAXMEM_FACTOR = 2;
const SALT_BYTES = 16;
const HASH_BYTES = 64;
const PREFIX = 'scrypt';
const FIELDS = 6;
const UNKNOWN_SALT = 'missing-account-salt';
/** Each derivation holds 128 MiB at the production cost: a handful at once, never a flood. */
const MAX_CONCURRENT = 4;
const UNAVAILABLE = 503;

type Stored = { cost: PasswordCost; salt: string; hash: Buffer };
let running = 0;

async function derive(secret: string, salt: string, cost: PasswordCost) {
  if (running >= MAX_CONCURRENT) throw new ApiError('Server busy, try again.', 'BUSY', UNAVAILABLE);
  running++;
  try {
    const maxmem = MAXMEM_FACTOR * BLOCK_BYTES * cost.N * cost.r;
    return await new Promise<Buffer>((done, fail) =>
      scrypt(secret, salt, HASH_BYTES, { ...cost, maxmem }, (error, key) =>
        error ? fail(error) : done(key),
      ),
    );
  } finally {
    running--;
  }
}

/** `scrypt$N$r$p$salt$hash`: the cost travels with the hash, so it can be raised later. */
function parse(stored: string | undefined): Stored | null {
  const fields = stored?.split('$') ?? [];
  if (fields[0] !== PREFIX || fields.length !== FIELDS) return null;
  const [N, r, p] = fields.slice(1, 4).map(Number) as [number, number, number];
  if (![N, r, p].every(Number.isSafeInteger)) return null;
  return { cost: { N, r, p }, salt: fields[4]!, hash: Buffer.from(fields[5]!, 'hex') };
}

const sameCost = (a: PasswordCost, b: PasswordCost) => a.N === b.N && a.r === b.r && a.p === b.p;

export async function hashSecret(secret: string, cost: PasswordCost) {
  const salt = randomBytes(SALT_BYTES).toString('hex');
  const hash = await derive(secret, salt, cost);
  return [PREFIX, cost.N, cost.r, cost.p, salt, hash.toString('hex')].join('$');
}

/**
 * Checks a secret against its stored hash. An unknown account still pays for one derivation,
 * so timing does not reveal which usernames exist. `stale` asks the caller to store a fresh hash.
 */
export async function verifySecret(secret: string, stored: string | undefined, cost: PasswordCost) {
  const parsed = parse(stored);
  const actual = await derive(secret, parsed?.salt ?? UNKNOWN_SALT, parsed?.cost ?? cost);
  const ok =
    !!parsed && actual.length === parsed.hash.length && timingSafeEqual(actual, parsed.hash);
  return { ok, stale: ok && !sameCost(parsed!.cost, cost) };
}
