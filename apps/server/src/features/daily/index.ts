import { dailyApi, type DailyStartResponse } from '@cardgame/protocol';
import type { Feature, Services } from '../../core/feature';
import { DailyService } from './daily-service';

/** Starting is cheap but opens a table: a person needs a handful a minute at most. */
const STARTS_PER_MINUTE = 10;

const instances = new WeakMap<Services, DailyService>();
const daily = (services: Services) => {
  let found = instances.get(services);
  if (!found) instances.set(services, (found = new DailyService(services)));
  return found;
};

/** The daily challenge: one shared deal a day, its ranking and streaks. */
export const dailyFeature: Feature = {
  name: 'daily',
  migrations: [
    {
      id: 'daily.1-results',
      up: `CREATE TABLE daily_results (
             account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
             day TEXT NOT NULL, room TEXT NOT NULL, started INTEGER NOT NULL, finished INTEGER,
             won INTEGER, score INTEGER, moves INTEGER, streak INTEGER, reward INTEGER,
             PRIMARY KEY (account_id, day));
           CREATE INDEX daily_results_day ON daily_results(day, finished);
           CREATE INDEX daily_results_open ON daily_results(room) WHERE finished IS NULL;`,
    },
  ],
  start: (services) => void daily(services).listen(),
  routes(router, services) {
    router
      .on('GET', dailyApi.daily, ({ me }) => daily(services).view(me()))
      .on('POST', dailyApi.start, ({ me }) => {
        services.limit(`daily:${me().id}`, STARTS_PER_MINUTE);
        return { room: daily(services).start(me()) } satisfies DailyStartResponse;
      });
  },
  exportData: (accountId, services) => ({ attempts: daily(services).history(accountId) }),
};
