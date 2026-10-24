/** Every member starts here. */
export const ELO_START = 1000;
/** How far one game moves a rating: the most a single result can win or lose. */
export const ELO_K = 32;
/** A gap of this many points means the stronger player is expected to score 10 times as much. */
export const ELO_SCALE = 400;
const ELO_BASE = 10;
/** Ratings stay provisional (shown with a badge) until this many rated games. */
export const PROVISIONAL_GAMES = 10;

/** 1 for a win, 0.5 for a draw, 0 for a loss, from the first player's side. */
export type EloScore = 0 | 0.5 | 1;

/** The score `rating` is expected to make against `opponent`, between 0 and 1. */
export function expectedScore(rating: number, opponent: number): number {
  return 1 / (1 + ELO_BASE ** ((opponent - rating) / ELO_SCALE));
}

/**
 * The points the first player gains (negative: loses) from one game. One rounded number is
 * added to one side and taken from the other, so ratings never create or destroy points.
 */
export function eloDelta(game: { a: number; b: number; scoreA: EloScore }): number {
  // `+ 0` turns a rounded -0 into 0.
  return Math.round(ELO_K * (game.scoreA - expectedScore(game.a, game.b))) + 0;
}

/** Both new ratings after a game between `a` and `b`. */
export function applyElo(game: { a: number; b: number; scoreA: EloScore }) {
  const delta = eloDelta(game);
  return { a: game.a + delta, b: game.b - delta, delta };
}

export const isProvisional = (games: number) => games < PROVISIONAL_GAMES;
