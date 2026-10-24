import { normalizeRoomCode, progressionApi } from '@cardgame/protocol';
import type { Feature } from '../../core/feature';
import { notFound } from '../../core/http/errors';
import { awardSeat, claimMission } from './award';
import { PROGRESSION_TABLES, ProgressStore } from './store';
import { progressionView } from './view';

/**
 * Experience, levels, missions, achievements and seasons. Listens to `match.finished` and, for
 * each person seated, records the result and pays it in one transaction (see docs/progression.md).
 */
export const progressionFeature: Feature = {
  name: 'progression',
  migrations: [{ id: 'progression.1-tables', up: PROGRESSION_TABLES }],
  start(services) {
    const store = new ProgressStore(services.db);
    services.events.on('match.finished', (event) =>
      event.seats.forEach((_, seat) => awardSeat(services, store, { event, seat })),
    );
  },
  routes(router, services) {
    const store = new ProgressStore(services.db);
    router
      .on('GET', progressionApi.progression, ({ me }) =>
        progressionView(store, { accountId: me().id, now: services.now() }),
      )
      .on('POST', progressionApi.claim(':id'), ({ me, params }) => {
        const accountId = me().id;
        const paid = claimMission(services, store, { accountId, id: params[0] ?? '' });
        return { ...paid, progression: progressionView(store, { accountId, now: services.now() }) };
      })
      .on('GET', progressionApi.result(':room'), ({ me, params }) => {
        const summary = store.lastSummary(me().id, normalizeRoomCode(params[0] ?? ''));
        if (!summary) throw notFound('No result at this table yet.');
        return summary;
      });
  },
  exportData(accountId, { db }) {
    const store = new ProgressStore(db);
    return {
      xp: store.xp(accountId),
      stats: store.stats(accountId),
      results: store.results(accountId, Number.MAX_SAFE_INTEGER),
      missions: store.allMissions(accountId),
      achievements: Object.fromEntries(store.unlocked(accountId)),
      seasons: store.seasons(accountId),
    };
  },
};
