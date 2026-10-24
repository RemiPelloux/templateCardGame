/**
 * What a finished match pays one player: experience and coins, by result, kind of table and
 * company. Every kind counts; a table with no other person pays a share, so farming bots is
 * slower than playing people, but practice online still moves the bar.
 */
export const PLAY_XP = 20;
export const WIN_XP = 30;
/** Each opponent beyond the first adds a little: bigger tables are longer and harder. */
export const EXTRA_OPPONENT_XP = 5;
export const PLAY_COINS = 5;
export const WIN_COINS = 15;
/** Percent applied by kind of table (the daily deal and ranked duels pay more). */
export const KIND_PERCENT: Readonly<Record<string, number>> = {
  casual: 100,
  daily: 150,
  ranked: 200,
};
/** Percent kept when every opponent is a bot. */
export const BOTS_ONLY_PERCENT = 50;
const FULL = 100;

export type MatchResult = {
  /** `casual`, `daily`, `ranked`: the room's kind. */
  kind: string;
  won: boolean;
  /** Seats at the table, bots included. */
  players: number;
  /** People at the table, this player included. */
  humans: number;
};
export type MatchReward = { xp: number; coins: number };

const percentFor = (result: MatchResult) =>
  ((KIND_PERCENT[result.kind] ?? FULL) * (result.humans > 1 ? FULL : BOTS_ONLY_PERCENT)) / FULL;

/** Experience and coins for one player's result. */
export function matchReward(result: MatchResult): MatchReward {
  const percent = percentFor(result);
  const opponents = Math.max(0, result.players - 2);
  const xp = PLAY_XP + (result.won ? WIN_XP : 0) + opponents * EXTRA_OPPONENT_XP;
  const coins = PLAY_COINS + (result.won ? WIN_COINS : 0);
  return {
    xp: Math.round((xp * percent) / FULL),
    coins: Math.round((coins * percent) / FULL),
  };
}
