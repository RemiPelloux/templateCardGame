import { applyElo, ELO_START, isProvisional, type EloScore } from '@cardgame/meta';
import type { RankedGame, RankedResult, RankedRow } from '@cardgame/protocol';
import type { Db } from '../../core/database';

export const LEADERBOARD_TOP = 20;
export const RECENT_GAMES = 10;

export type Rating = { rating: number; games: number; wins: number };
type Row = { account_id: string; name: string; tag: number; rating: number; games: number };
/** A duel to rate: who sat where, how it ended for `a`, and when. */
/** One member's side of a rated game. */
type Side = { id: string; other: string; before: Rating; rating: number; score: EloScore };
export type RatedGame = { room: string; a: string; b: string; scoreA: EloScore; ended: number };

/** Best rating first; at equal rating, the more games played; then by name, for a stable order. */
const BOARD = `SELECT r.account_id, a.username AS name, a.tag, r.rating, r.games,
    ROW_NUMBER() OVER (ORDER BY r.rating DESC, r.games DESC, a.username) AS rank
  FROM ranked_ratings r JOIN accounts a ON a.id = r.account_id`;

const toRow = (row: Row & { rank: number }): RankedRow => ({
  rank: row.rank,
  name: row.name,
  handle: `${row.name}#${row.tag}`,
  rating: row.rating,
  games: row.games,
  provisional: isProvisional(row.games),
});

const resultOf = (score: EloScore): RankedResult =>
  score === 1 ? 'win' : score === 0 ? 'loss' : 'draw';

/** Ratings, their history and the leaderboard, in SQLite. A member without games is at the start. */
export class Ratings {
  constructor(private db: Db) {}

  of(accountId: string): Rating {
    const row = this.db
      .prepare('SELECT rating, games, wins FROM ranked_ratings WHERE account_id = ?')
      .get(accountId) as Rating | undefined;
    return row ?? { rating: ELO_START, games: 0, wins: 0 };
  }

  /** Applies one game to both ratings and writes it in each member's history. */
  record(game: RatedGame) {
    const a = this.of(game.a);
    const b = this.of(game.b);
    const next = applyElo({ a: a.rating, b: b.rating, scoreA: game.scoreA });
    const scoreB = (1 - game.scoreA) as EloScore;
    this.write(game, { id: game.a, other: game.b, before: a, rating: next.a, score: game.scoreA });
    this.write(game, { id: game.b, other: game.a, before: b, rating: next.b, score: scoreB });
  }

  private write(game: RatedGame, side: Side) {
    const won = side.score === 1 ? 1 : 0;
    this.db
      .prepare('INSERT OR REPLACE INTO ranked_ratings VALUES (?, ?, ?, ?)')
      .run(side.id, side.rating, side.before.games + 1, side.before.wins + won);
    this.db
      .prepare(
        `INSERT INTO ranked_history (account_id, room, opponent, result, delta, rating, ended)
         SELECT @id, @room, username || '#' || tag, @result, @delta, @rating, @ended
         FROM accounts WHERE id = @other`,
      )
      .run({
        id: side.id,
        other: side.other,
        rating: side.rating,
        room: game.room,
        result: resultOf(side.score),
        delta: side.rating - side.before.rating,
        ended: game.ended,
      });
  }

  leaderboard(accountId: string): { top: RankedRow[]; me: RankedRow | null } {
    const top = this.db.prepare(`${BOARD} ORDER BY rank LIMIT ?`).all(LEADERBOARD_TOP) as (Row & {
      rank: number;
    })[];
    const me = this.db.prepare(`SELECT * FROM (${BOARD}) WHERE account_id = ?`).get(accountId) as
      (Row & { rank: number }) | undefined;
    return { top: top.map(toRow), me: me ? toRow(me) : null };
  }

  recent(accountId: string, limit = RECENT_GAMES): RankedGame[] {
    return this.db
      .prepare(
        'SELECT room, opponent, result, delta, rating, ended FROM ranked_history WHERE account_id = ? ORDER BY ended DESC, id DESC LIMIT ?',
      )
      .all(accountId, limit) as RankedGame[];
  }
}
