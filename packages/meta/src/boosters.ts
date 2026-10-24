import { ITEMS, RARITIES, SLOTS, type Item, type Rarity } from './items';

/**
 * Boosters: packs of random cosmetics bought with coins (never real money). Opening one is a
 * pure function of the booster, a source of random numbers and what the member already owns, so
 * the server decides with its own RNG and tests replay an opening from a seed. Ids are
 * permanent, like item ids; names are translated by id on the client (`shop.boosters.<id>`).
 */
export type Booster = {
  id: string;
  /** Coins per opening. */
  price: number;
  /** Items revealed per opening. */
  reveals: number;
  /** Relative odds of each rarity on every reveal; 0 leaves a rarity out. */
  weights: Record<Rarity, number>;
};

/** Coins given back for a duplicate, by rarity: below a booster's price, so packs stay a gamble. */
export const DUPLICATE_REFUND: Record<Rarity, number> = {
  common: 25,
  rare: 60,
  epic: 150,
  legendary: 400,
};

const STANDARD_PRICE = 250;
const PREMIUM_PRICE = 600;
const REVEALS_PER_BOOSTER = 3;

export const BOOSTERS: readonly Booster[] = [
  {
    id: 'booster-standard',
    price: STANDARD_PRICE,
    reveals: REVEALS_PER_BOOSTER,
    weights: { common: 70, rare: 22, epic: 7, legendary: 1 },
  },
  {
    id: 'booster-premium',
    price: PREMIUM_PRICE,
    reveals: REVEALS_PER_BOOSTER,
    weights: { common: 0, rare: 60, epic: 30, legendary: 10 },
  },
];

const boosterMap = new Map(BOOSTERS.map((booster) => [booster.id, booster]));
export const boosterById = (id: string) => boosterMap.get(id);

const isCosmetic = (item: Item) => (SLOTS as readonly string[]).includes(item.kind);

/** What boosters can reveal, by rarity: every cosmetic but the starters (expansions never). */
export const BOOSTER_POOL: Record<Rarity, readonly Item[]> = Object.fromEntries(
  RARITIES.map((rarity) => [
    rarity,
    ITEMS.filter((item) => isCosmetic(item) && !item.starter && item.rarity === rarity),
  ]),
) as Record<Rarity, readonly Item[]>;

/** One card of an opening; a duplicate is not granted again but refunded. */
export type Reveal = { item: string; rarity: Rarity; duplicate: boolean; refund: number };
export type Opening = { reveals: Reveal[]; refund: number };

/** `random` returns numbers in [0, 1). */
type Random = () => number;

const pick = <T>(list: readonly T[], random: Random): T =>
  list[Math.min(list.length - 1, Math.floor(random() * list.length))]!;

function rollRarity(weights: Record<Rarity, number>, random: Random): Rarity {
  const offered = RARITIES.filter((r) => weights[r] > 0 && BOOSTER_POOL[r].length > 0);
  if (!offered.length) throw new Error('This booster can reveal nothing.');
  let roll = random() * offered.reduce((sum, r) => sum + weights[r], 0);
  for (const rarity of offered) {
    roll -= weights[rarity];
    if (roll < 0) return rarity;
  }
  return offered[offered.length - 1]!;
}

/** Duplicate protection: a rarity reveals an item the member lacks while one is left. */
function revealOne(booster: Booster, random: Random, owned: ReadonlySet<string>): Reveal {
  const rarity = rollRarity(booster.weights, random);
  const pool = BOOSTER_POOL[rarity];
  const missing = pool.filter((item) => !owned.has(item.id));
  const item = pick(missing.length ? missing : pool, random);
  const duplicate = owned.has(item.id);
  return { item: item.id, rarity, duplicate, refund: duplicate ? DUPLICATE_REFUND[rarity] : 0 };
}

/**
 * Opens a booster for a member owning `owned`. An item revealed twice in the same opening counts
 * as owned from its first reveal, so the second one is a refunded duplicate.
 */
export function openBooster(booster: Booster, random: Random, owned: Iterable<string>): Opening {
  const have = new Set(owned);
  const reveals: Reveal[] = [];
  for (let i = 0; i < booster.reveals; i++) {
    const reveal = revealOne(booster, random, have);
    have.add(reveal.item);
    reveals.push(reveal);
  }
  return { reveals, refund: reveals.reduce((sum, r) => sum + r.refund, 0) };
}
