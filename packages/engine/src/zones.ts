import { RuleError } from './errors';

/** Anything that can sit in a zone: cards, tokens, tiles. Ids are unique within a match. */
export type Identified = { id: string };

export const findById = <T extends Identified>(zone: readonly T[], id: string) =>
  zone.find((item) => item.id === id);

/** Removes and returns the item with `id`, or throws a RuleError the player can read. */
export function takeById<T extends Identified>(zone: T[], id: string): T {
  const index = zone.findIndex((item) => item.id === id);
  if (index < 0) throw new RuleError('That card is not there.', 'CARD_NOT_FOUND');
  return zone.splice(index, 1)[0]!;
}

/** Takes up to `count` items from the top of a pile (the end of the array). */
export const drawFrom = <T>(pile: T[], count: number): T[] =>
  pile.splice(Math.max(0, pile.length - count)).reverse();

/** The top of a pile (its last item), if any. */
export const topOf = <T>(pile: readonly T[]): T | undefined => pile[pile.length - 1];

/** Moves the item with `id` from one zone to the end of another and returns it. */
export function moveById<T extends Identified>(from: T[], to: T[], id: string): T {
  const item = takeById(from, id);
  to.push(item);
  return item;
}
