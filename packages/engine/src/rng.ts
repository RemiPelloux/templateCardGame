import { randomUint32 } from './platform';

/** Anything that carries the RNG's 32-bit state; the match does, so a saved match resumes exactly. */
export type RngHolder = { rng: number };

export interface Rng {
  /** A float in [0, 1). */
  next(): number;
  /** An integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  /** Shuffles in place (Fisher–Yates) and returns the same array. */
  shuffle<T>(items: T[]): T[];
}

const UINT32 = 4294967296;
const MULBERRY_INCREMENT = 0x6d2b79f5;
const MIX_A = 15;
const MIX_B = 7;
const MIX_C = 14;
const MIX_D = 61;

/** Mulberry32: tiny, fast, good enough for card games; the state lives in `holder.rng`. */
function step(holder: RngHolder): number {
  holder.rng = (holder.rng + MULBERRY_INCREMENT) >>> 0;
  let t = holder.rng;
  t = Math.imul(t ^ (t >>> MIX_A), t | 1);
  t ^= t + Math.imul(t ^ (t >>> MIX_B), t | MIX_D);
  return ((t ^ (t >>> MIX_C)) >>> 0) / UINT32;
}

export function createRng(holder: RngHolder): Rng {
  const int = (maxExclusive: number) => Math.floor(step(holder) * maxExclusive);
  return {
    next: () => step(holder),
    int,
    pick<T>(items: readonly T[]) {
      if (!items.length) throw new Error('Cannot pick from an empty list.');
      return items[int(items.length)]!;
    },
    shuffle<T>(items: T[]) {
      for (let i = items.length - 1; i > 0; i--) {
        const j = int(i + 1);
        [items[i], items[j]] = [items[j]!, items[i]!];
      }
      return items;
    },
  };
}

/** A fresh, unpredictable seed. Servers deal with it; tests pass fixed seeds instead. */
export const randomSeed = () => randomUint32();

const HASH_PRIME = 0x01000193;
const HASH_OFFSET = 0x811c9dc5;

/** Derives an independent 32-bit seed from several numbers (FNV-1a over their words). */
export function deriveSeed(...parts: number[]): number {
  let hash = HASH_OFFSET;
  for (const part of parts) hash = Math.imul(hash ^ (part >>> 0), HASH_PRIME) >>> 0;
  return hash;
}
