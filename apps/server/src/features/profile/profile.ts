import { ACHIEVEMENTS, achievementProgress, LEVEL_STAT, levelFor } from '@cardgame/meta';
import type { KindStats, MatchLine, Player, ProfileView, RoomKind } from '@cardgame/protocol';
import type { Services } from '../../core/feature';

/** Matches listed on a profile. */
export const RECENT_MATCHES = 10;

/*
 * A profile is a read-only page over progression's tables (`progression`, `progress_stats`,
 * `achievements`, `match_results`): reading them in SQL keeps the two features from importing
 * each other, and only progression ever writes them.
 */

const scalar = (services: Services, sql: string, ...args: unknown[]) =>
  (services.db.prepare(sql).get(...args) as { value: number } | undefined)?.value ?? 0;

function statsOf(services: Services, accountId: string): ProfileView['stats'] {
  const rows = services.db
    .prepare(
      'SELECT kind, COUNT(*) AS matches, SUM(won) AS wins FROM match_results WHERE account_id = ? GROUP BY kind',
    )
    .all(accountId) as (KindStats & { kind: RoomKind })[];
  const byKind = Object.fromEntries(
    rows.map((r) => [r.kind, { matches: r.matches, wins: r.wins }]),
  );
  const sum = (key: keyof KindStats) => rows.reduce((total, r) => total + r[key], 0);
  return { matches: sum('matches'), wins: sum('wins'), byKind };
}

function achievementsOf(services: Services, accountId: string, level: number) {
  const stats = Object.fromEntries(
    (
      services.db
        .prepare('SELECT stat, value FROM progress_stats WHERE account_id = ?')
        .all(accountId) as { stat: string; value: number }[]
    ).map((r) => [r.stat, r.value]),
  );
  const unlocked = new Map(
    (
      services.db
        .prepare('SELECT achievement_id, unlocked FROM achievements WHERE account_id = ?')
        .all(accountId) as { achievement_id: string; unlocked: number }[]
    ).map((r) => [r.achievement_id, r.unlocked]),
  );
  return ACHIEVEMENTS.map((achievement) => ({
    ...{ id: achievement.id, goal: achievement.goal, reward: achievement.reward },
    progress: achievementProgress(achievement, { ...stats, [LEVEL_STAT]: level }),
    unlocked: unlocked.get(achievement.id) ?? null,
  }));
}

function recentOf(services: Services, accountId: string): MatchLine[] {
  const rows = services.db
    .prepare(
      `SELECT room, kind, won, score, players, xp, ended FROM match_results
       WHERE account_id = ? ORDER BY ended DESC, id DESC LIMIT ?`,
    )
    .all(accountId, RECENT_MATCHES) as (MatchLine & { won: number })[];
  return rows.map((r) => ({ ...r, won: r.won === 1 }));
}

/** A member's public profile. */
export function profileOf(services: Services, player: Player): ProfileView {
  const xp = scalar(
    services,
    'SELECT xp AS value FROM progression WHERE account_id = ?',
    player.id,
  );
  const level = levelFor(xp);
  return {
    ...{ name: player.name, tag: player.tag, handle: `${player.name}#${player.tag}` },
    equipped: services.inventory.equipped(player.id),
    level,
    stats: statsOf(services, player.id),
    achievements: achievementsOf(services, player.id, level.level),
    recent: recentOf(services, player.id),
  };
}
