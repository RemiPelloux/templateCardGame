import { isProvisional, type EloScore } from '@cardgame/meta';
import type { Player, RankedQueueStatus, RankedView } from '@cardgame/protocol';
import type { MatchFinished } from '../../core/events';
import type { Services } from '../../core/feature';
import { ApiError } from '../../core/http/errors';
import { gapAfter, MatchQueue, type Waiting } from './queue';
import { Ratings } from './ratings';

/** A duel opened by matchmaking and not rated yet. `a` sits in seat 0, `b` in seat 1. */
type Duel = {
  id: number;
  room: string;
  a: string;
  b: string;
  a_left: number | null;
  b_left: number | null;
};

/** How a duel ended for `a`, given who walked away: leaving loses, whatever the bot does next. */
function scoreFor(left: { a: boolean; b: boolean }, winners: { a: boolean; b: boolean }): EloScore {
  if (left.a !== left.b) return left.a ? 0 : 1;
  if (winners.a !== winners.b) return winners.a ? 1 : 0;
  return 0.5;
}

/**
 * Ranked duels: the matchmaking queue, the tables it opens, and the Elo update when they end.
 * Duels are kept in `ranked_matches` so a restart, or a member leaving, cannot dodge a result.
 */
export class RankedService {
  readonly queue = new MatchQueue();
  readonly ratings: Ratings;

  constructor(private services: Services) {
    this.ratings = new Ratings(services.db);
  }

  /** Rates duels as their tables finish. Call once. */
  listen() {
    this.services.events.on('match.finished', (event) => this.finished(event));
    return this;
  }

  join(player: Player): RankedQueueStatus {
    if (!this.current(player.id))
      this.queue.join(player, this.ratings.of(player.id).rating, this.services.now());
    return this.status(player.id);
  }

  leave(accountId: string): RankedQueueStatus {
    this.queue.leave(accountId);
    return this.status(accountId);
  }

  /** Where the member stands; reading it also keeps them in the queue. */
  status(accountId: string): RankedQueueStatus {
    const duel = this.current(accountId);
    if (duel) return { state: 'matched', room: duel.room };
    const now = this.services.now();
    const waiting = this.queue.touch(accountId, now);
    if (!waiting) return { state: 'idle' };
    return { state: 'searching', since: waiting.since, gap: gapAfter(waiting.since, now) };
  }

  view(player: Player): RankedView {
    const mine = this.ratings.of(player.id);
    return {
      ...mine,
      provisional: isProvisional(mine.games),
      queue: this.status(player.id),
      leaderboard: this.ratings.leaderboard(player.id),
      recent: this.ratings.recent(player.id),
    };
  }

  /** Pairs the queue, then notices members who walked away from an unfinished duel. */
  tick() {
    for (const [a, b] of this.queue.pair(this.services.now())) this.open(a, b);
    for (const duel of this.unrated()) this.watch(duel);
  }

  private open(a: Waiting, b: Waiting) {
    const { rooms, db, now } = this.services;
    try {
      const room = rooms.openMatch({ kind: 'ranked', players: [a.player, b.player] });
      db.prepare('INSERT INTO ranked_matches (room, a, b, started) VALUES (?, ?, ?, ?)').run(
        room,
        a.player.id,
        b.player.id,
        now(),
      );
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;
      // No table free right now: both keep their place and are paired again shortly.
      this.queue.restore(a);
      this.queue.restore(b);
    }
  }

  /** Marks who left; once both have, the table is gone and the first to leave loses. */
  private watch(duel: Duel) {
    const now = this.services.now();
    const aLeft = duel.a_left ?? (this.seated(duel.a, duel.room) ? null : now);
    const bLeft = duel.b_left ?? (this.seated(duel.b, duel.room) ? null : now);
    if (aLeft !== null && bLeft !== null) {
      const score = aLeft === bLeft ? 0.5 : aLeft > bLeft ? 1 : 0;
      return this.rate(duel, score, now);
    }
    if (aLeft !== duel.a_left || bLeft !== duel.b_left)
      this.services.db
        .prepare('UPDATE ranked_matches SET a_left = ?, b_left = ? WHERE id = ?')
        .run(aLeft, bLeft, duel.id);
  }

  private finished(event: MatchFinished) {
    if (event.kind !== 'ranked') return;
    const duel = this.unrated().find((d) => d.room === event.room);
    if (!duel) return;
    const winners = event.match.outcome!.winners;
    const left = {
      a: event.seats[0]?.accountId !== duel.a,
      b: event.seats[1]?.accountId !== duel.b,
    };
    const score = scoreFor(left, { a: winners.includes(0), b: winners.includes(1) });
    this.rate(duel, score, event.ended);
  }

  private rate(duel: Duel, scoreA: EloScore, ended: number) {
    const { db } = this.services;
    db.transaction(() => {
      this.ratings.record({ room: duel.room, a: duel.a, b: duel.b, scoreA, ended });
      db.prepare('UPDATE ranked_matches SET resolved = ? WHERE id = ?').run(ended, duel.id);
    })();
  }

  private unrated(): Duel[] {
    return this.services.db
      .prepare('SELECT * FROM ranked_matches WHERE resolved IS NULL')
      .all() as Duel[];
  }

  /** The unrated duel the member is still seated at, if any. */
  private current(accountId: string): Duel | undefined {
    const duels = this.services.db
      .prepare('SELECT * FROM ranked_matches WHERE resolved IS NULL AND (a = @id OR b = @id)')
      .all({ id: accountId }) as Duel[];
    return duels.find((duel) => this.seated(accountId, duel.room));
  }

  private seated(accountId: string, room: string) {
    return this.services.rooms.roomsOf(accountId).some((r) => r.code === room);
  }
}
