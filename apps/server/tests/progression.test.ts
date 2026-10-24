import { beforeEach, describe, expect, it } from 'vitest';
import {
  activeMissions,
  DAY_MS,
  levelFor,
  matchReward,
  missionById,
  xpForLevel,
} from '@cardgame/meta';
import type { Player } from '@cardgame/protocol';
import type { MatchFinished } from '../src/core/events';
import type { Services } from '../src/core/feature';
import { progressionFeature } from '../src/features/progression';
import { awardSeat, claimMission } from '../src/features/progression/award';
import { ProgressStore } from '../src/features/progression/store';
import { progressionView } from '../src/features/progression/view';
import type { GameMatch } from '../src/features/rooms/model';
import { PASSWORD, signUp, testServices } from './support';

const SATURDAY = Date.UTC(2026, 9, 24, 12);
let services: Services;
let clock: { now: number };
let store: ProgressStore;
let ada: Player;
let bob: Player;

beforeEach(async () => {
  ({ services, clock } = testServices());
  clock.now = SATURDAY;
  progressionFeature.start!(services);
  store = new ProgressStore(services.db);
  ada = await signUp(services, 'ada');
  bob = await signUp(services, 'bob');
});

type Finish = {
  room?: string;
  seed?: number;
  winner?: number;
  eights?: number;
  kind?: MatchFinished['kind'];
};

/** A finished match between ada (seat 0) and bob (seat 1), ada playing `eights` eights. */
function finished(input: Finish = {}): MatchFinished {
  const log = Array.from({ length: input.eights ?? 0 }, (_, i) => ({
    seq: i + 1,
    seat: 0,
    event: 'play',
    data: { card: { id: '8H', suit: 'hearts', rank: '8' } },
  }));
  const match = {
    seed: input.seed ?? 7,
    version: 30,
    log,
    outcome: { winners: [input.winner ?? 0], scores: [12, 0] },
  } as unknown as GameMatch;
  return {
    room: input.room ?? 'ABCD',
    kind: input.kind ?? 'casual',
    match,
    seats: [
      { accountId: ada.id, bot: null, name: 'ada' },
      { accountId: bob.id, bot: null, name: 'bob' },
    ],
    ended: clock.now,
  };
}

const view = (player: Player) => progressionView(store, { accountId: player.id, now: clock.now });

describe('match rewards', () => {
  it('pays each person once even if the event fires twice', () => {
    const event = finished();
    services.events.emit('match.finished', event);
    services.events.emit('match.finished', event);
    const win = matchReward({ kind: 'casual', won: true, players: 2, humans: 2 });
    const loss = matchReward({ kind: 'casual', won: false, players: 2, humans: 2 });
    expect(store.xp(ada.id)).toBe(win.xp);
    expect(store.xp(bob.id)).toBe(loss.xp);
    expect(store.results(ada.id, 10)).toHaveLength(1);
    const summary = store.lastSummary(ada.id, 'ABCD')!;
    expect(summary).toMatchObject({ won: true, xp: win.xp, level: { before: 1, after: 1 } });
    expect(services.wallet.balance(ada.id)).toBe(summary.coins);
    expect(summary.achievements).toEqual(['first-match', 'first-win']);
  });

  it('pays nothing to a seat a bot took over', () => {
    const event = finished();
    event.seats[1] = { ...event.seats[1]!, bot: 'basic' };
    services.events.emit('match.finished', event);
    expect(store.xp(bob.id)).toBe(0);
    expect(store.results(ada.id, 10)[0]).toMatchObject({ humans: 1 });
  });

  it('levels up and pays each level crossed', () => {
    store.addXp(ada.id, xpForLevel(10) - 1);
    const summary = awardSeat(services, store, { event: finished(), seat: 0 })!;
    expect(summary.level).toEqual({ before: 9, after: 10 });
    expect(summary.items).toContain('felt-midnight');
    expect(services.inventory.owns(ada.id, 'felt-midnight')).toBe(true);
    expect(view(ada).level.level).toBe(levelFor(store.xp(ada.id)).level);
  });
});

describe('missions', () => {
  it('progresses, completes, pays on claim once, and rolls over the next day', () => {
    const daily = activeMissions(clock.now).find((m) => m.period === 'daily')!;
    for (let i = 0; i < daily.goal + 2; i++)
      services.events.emit(
        'match.finished',
        finished({ seed: i, eights: daily.goal, kind: 'daily' }),
      );
    const mission = view(ada).missions.find((m) => m.id === daily.id)!;
    expect(mission.progress).toBe(daily.goal);
    const before = services.wallet.balance(ada.id);
    const paid = claimMission(services, store, { accountId: ada.id, id: daily.id });
    expect(paid.xp).toBe(daily.reward.xp);
    expect(paid.coins).toBeGreaterThanOrEqual(daily.reward.coins);
    expect(services.wallet.balance(ada.id)).toBe(before + paid.coins);
    expect(() => claimMission(services, store, { accountId: ada.id, id: daily.id })).toThrow(
      /already claimed/,
    );
    clock.now += DAY_MS;
    const tomorrow = view(ada).missions.filter((m) => m.period === 'daily');
    expect(tomorrow.every((m) => m.progress === 0 && !m.claimed)).toBe(true);
  });

  it('refuses incomplete or inactive missions', () => {
    const daily = activeMissions(clock.now).find((m) => m.period === 'daily')!;
    expect(() => claimMission(services, store, { accountId: ada.id, id: daily.id })).toThrow(
      /not complete/,
    );
    expect(() => claimMission(services, store, { accountId: ada.id, id: 'nope' })).toThrow(
      /not on/,
    );
  });
});

describe('account deletion', () => {
  it('removes every progression row', async () => {
    services.events.emit('match.finished', finished());
    await services.accounts.delete(ada.id, PASSWORD);
    for (const table of [
      'progression',
      'season_xp',
      'progress_stats',
      'match_results',
      'achievements',
    ])
      expect(
        services.db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE account_id = ?`).get(ada.id),
      ).toEqual({ n: 0 });
    expect(store.xp(bob.id)).toBeGreaterThan(0);
  });

  it('exports the member’s rows', () => {
    services.events.emit('match.finished', finished());
    const data = progressionFeature.exportData!(ada.id, services) as { results: unknown[] };
    expect(data.results).toHaveLength(1);
  });
});
