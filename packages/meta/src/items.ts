/**
 * Everything a member can own. Names and descriptions are translated by id on the client
 * (`items.<id>`), so this file holds no text. Ids are permanent: never rename or reuse one.
 */
export const SLOTS = ['cardBack', 'felt', 'frame'] as const;
export type Slot = (typeof SLOTS)[number];
export type ItemKind = Slot | 'expansion';
export const RARITIES = ['common', 'rare', 'epic', 'legendary'] as const;
export type Rarity = (typeof RARITIES)[number];

export type Item = {
  id: string;
  kind: ItemKind;
  rarity: Rarity;
  /** Coins to buy it outright in the shop; absent when it only comes from boosters or rewards. */
  price?: number;
  /** Every account owns it from the start (and wears it when nothing else is equipped). */
  starter?: true;
  /** Visual tokens the client applies (colours of a back or a felt). */
  look?: Record<string, string>;
};

export const ITEMS: readonly Item[] = [
  {
    id: 'back-ember',
    kind: 'cardBack',
    rarity: 'common',
    starter: true,
    look: { base: '#7c2d12', stripe: '#9a3412' },
  },
  {
    id: 'back-ocean',
    kind: 'cardBack',
    rarity: 'common',
    price: 150,
    look: { base: '#1e3a8a', stripe: '#1d4ed8' },
  },
  {
    id: 'back-forest',
    kind: 'cardBack',
    rarity: 'rare',
    price: 400,
    look: { base: '#14532d', stripe: '#15803d' },
  },
  {
    id: 'back-royal',
    kind: 'cardBack',
    rarity: 'epic',
    look: { base: '#581c87', stripe: '#a16207' },
  },
  {
    id: 'back-gold',
    kind: 'cardBack',
    rarity: 'legendary',
    look: { base: '#713f12', stripe: '#eab308' },
  },
  {
    id: 'back-sunset',
    kind: 'cardBack',
    rarity: 'rare',
    look: { base: '#9d174d', stripe: '#ea580c' },
  },
  {
    id: 'felt-green',
    kind: 'felt',
    rarity: 'common',
    starter: true,
    look: { felt: '#1f6b45', deep: '#134a2f' },
  },
  {
    id: 'felt-navy',
    kind: 'felt',
    rarity: 'common',
    price: 200,
    look: { felt: '#1e3a5f', deep: '#0f2440' },
  },
  {
    id: 'felt-burgundy',
    kind: 'felt',
    rarity: 'rare',
    price: 500,
    look: { felt: '#7f1d1d', deep: '#4c0f0f' },
  },
  { id: 'felt-midnight', kind: 'felt', rarity: 'epic', look: { felt: '#1e1b4b', deep: '#0b0a24' } },
  {
    id: 'felt-teal',
    kind: 'felt',
    rarity: 'common',
    price: 180,
    look: { felt: '#115e59', deep: '#083b38' },
  },
  {
    id: 'frame-none',
    kind: 'frame',
    rarity: 'common',
    starter: true,
    look: { ring: 'transparent' },
  },
  { id: 'frame-silver', kind: 'frame', rarity: 'rare', price: 300, look: { ring: '#94a3b8' } },
  { id: 'frame-gold', kind: 'frame', rarity: 'legendary', look: { ring: '#eab308' } },
  { id: 'frame-bronze', kind: 'frame', rarity: 'common', price: 120, look: { ring: '#b45309' } },
  { id: 'frame-ruby', kind: 'frame', rarity: 'epic', look: { ring: '#e11d48' } },
  /** Unlocks the expansion of the same name for the tables its owner hosts (packages/game). */
  { id: 'expansion-jokers', kind: 'expansion', rarity: 'epic', price: 800 },
];

const byId = new Map(ITEMS.map((item) => [item.id, item]));
export const itemById = (id: string) => byId.get(id);
export const isItemId = (id: unknown): id is string => typeof id === 'string' && byId.has(id);
export const STARTER_ITEMS = ITEMS.filter((item) => item.starter).map((item) => item.id);
/** What a slot shows when its owner equipped nothing. */
export const defaultFor = (slot: Slot) => ITEMS.find((i) => i.kind === slot && i.starter)!.id;
