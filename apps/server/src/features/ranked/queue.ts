import type { Player } from '@cardgame/protocol';

const SECOND_MS = 1000;
/** Rating gap accepted at once; it widens by `GAP_GROWTH` each second spent waiting. */
export const BASE_GAP = 100;
export const GAP_GROWTH = 10;
/** Past this gap, waiting longer does not widen the search any further. */
export const MAX_GAP = 800;
/** A member who stops polling for this long has closed the page: they leave the queue. */
export const QUEUE_STALE_MS = 30 * SECOND_MS;
/** Bounds the pairing work (quadratic in the queue's size). */
export const MAX_QUEUE = 1000;

export type Waiting = { player: Player; rating: number; since: number; seen: number };
type Candidate = { a: Waiting; b: Waiting; gap: number };

/** The rating gap a member accepts after waiting since `since`. */
export const gapAfter = (since: number, now: number) =>
  Math.min(MAX_GAP, BASE_GAP + Math.floor((now - since) / SECOND_MS) * GAP_GROWTH);

/**
 * Members looking for a ranked duel, in memory (the server runs as a single instance; a restart
 * empties the queue and the page simply joins again on its next poll).
 */
export class MatchQueue {
  private waiting = new Map<string, Waiting>();

  join(player: Player, rating: number, now: number): Waiting {
    const found = this.waiting.get(player.id);
    if (found) return Object.assign(found, { seen: now, rating });
    const entry = { player, rating, since: now, seen: now };
    if (this.waiting.size < MAX_QUEUE) this.waiting.set(player.id, entry);
    return entry;
  }

  /** Puts an entry back as it was (its table could not be opened), keeping its waiting time. */
  restore(entry: Waiting) {
    this.waiting.set(entry.player.id, entry);
  }

  leave(accountId: string) {
    this.waiting.delete(accountId);
  }

  /** Keeps a waiting member in the queue; their entry, or undefined when not waiting. */
  touch(accountId: string, now: number): Waiting | undefined {
    const found = this.waiting.get(accountId);
    if (found) found.seen = now;
    return found;
  }

  get size() {
    return this.waiting.size;
  }

  /**
   * Drops stale entries, then takes pairs out of the queue: the closest ratings first, each
   * pair within the gap both members accept by now (ties go to whoever waited longest).
   */
  pair(now: number): [Waiting, Waiting][] {
    for (const [id, entry] of this.waiting)
      if (now - entry.seen > QUEUE_STALE_MS) this.waiting.delete(id);
    const taken = new Set<string>();
    const pairs: [Waiting, Waiting][] = [];
    for (const { a, b } of this.candidates(now)) {
      if (taken.has(a.player.id) || taken.has(b.player.id)) continue;
      taken.add(a.player.id).add(b.player.id);
      pairs.push([a, b]);
    }
    for (const id of taken) this.waiting.delete(id);
    return pairs;
  }

  private candidates(now: number): Candidate[] {
    const sorted = [...this.waiting.values()].sort((x, y) => x.rating - y.rating);
    const found: Candidate[] = [];
    sorted.forEach((a, i) => {
      for (const b of sorted.slice(i + 1)) {
        const gap = b.rating - a.rating;
        if (gap > gapAfter(a.since, now)) break;
        if (gap <= gapAfter(b.since, now)) found.push({ a, b, gap });
      }
    });
    const oldest = (c: Candidate) => Math.min(c.a.since, c.b.since);
    return found.sort((x, y) => x.gap - y.gap || oldest(x) - oldest(y));
  }
}
