/**
 * Bot-versus-bot statistics for balancing: `pnpm sim --games 1000 --players 4 --bot basic`,
 * with an expansion: `--expansion jokers`.
 * Seat 0 plays `--bot`, the others play `--rivals` (default: the same bot). Deterministic:
 * the same arguments always print the same numbers.
 */
import { parseArgs } from 'node:util';
import { simulate } from '@cardgame/engine';
import { bots, DEFAULT_BOT, game } from '@cardgame/game';

const { values } = parseArgs({
  options: {
    games: { type: 'string', default: '500' },
    players: { type: 'string', default: String(game.players.min) },
    bot: { type: 'string', default: DEFAULT_BOT },
    rivals: { type: 'string' },
    seed: { type: 'string', default: '1' },
    expansion: { type: 'string' },
  },
});
const played = values.expansion
  ? { ...game, defaultOptions: game.parseOptions({ expansion: values.expansion }) }
  : game;

const games = Number(values.games);
const players = Number(values.players);
const firstSeed = Number(values.seed);
const hero = bots[values.bot];
const rival = bots[values.rivals ?? values.bot];
if (!hero || !rival) throw new Error(`Unknown bot. Choose from: ${Object.keys(bots).join(', ')}`);

const wins = Array<number>(players).fill(0);
const lengths: number[] = [];
const reasons = new Map<string, number>();
const started = performance.now();
for (let seed = firstSeed; seed < firstSeed + games; seed++) {
  const match = simulate(played, { players, seed, bots: (seat) => (seat === 0 ? hero : rival) });
  match.outcome!.winners.forEach((seat) => wins[seat]!++);
  lengths.push(match.version);
  const reason = match.outcome!.reason ?? 'none';
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
}

const PERCENT = 100;
const sorted = [...lengths].sort((a, b) => a - b);
const percent = (n: number) => `${((n / games) * PERCENT).toFixed(1)}%`;
console.log(
  `${game.name}${values.expansion ? ` + ${values.expansion}` : ''}: ${games} games, ${players} players, seat 0 = ${values.bot}, others = ${values.rivals ?? values.bot}`,
);
console.table(wins.map((n, seat) => ({ seat, wins: n, rate: percent(n) })));
console.log(
  `moves: median ${sorted[Math.floor(games / 2)]}, max ${sorted.at(-1)}, mean ${(lengths.reduce((a, b) => a + b, 0) / games).toFixed(1)}`,
);
console.log(`endings: ${[...reasons].map(([reason, n]) => `${reason} ${percent(n)}`).join(', ')}`);
console.log(`${Math.round(performance.now() - started)} ms`);
