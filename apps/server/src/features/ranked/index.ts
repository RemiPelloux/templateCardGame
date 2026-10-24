import { rankedApi } from '@cardgame/protocol';
import type { Feature, Services } from '../../core/feature';
import { every } from '../../core/schedule';
import { RankedService } from './ranked-service';

/** Pairing once a second is quick enough for people and cheap for the server. */
const PAIR_EVERY_MS = 1000;
/** Joining and leaving the queue: a few clicks a minute for a person. */
const QUEUE_CHANGES_PER_MINUTE = 30;

const instances = new WeakMap<Services, RankedService>();
const ranked = (services: Services) => {
  let found = instances.get(services);
  if (!found) instances.set(services, (found = new RankedService(services)));
  return found;
};

/** Ranked duels: the Elo rating, the matchmaking queue and the leaderboard. */
export const rankedFeature: Feature = {
  name: 'ranked',
  migrations: [
    {
      id: 'ranked.1-tables',
      up: `CREATE TABLE ranked_ratings (
             account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
             rating INTEGER NOT NULL, games INTEGER NOT NULL, wins INTEGER NOT NULL);
           CREATE INDEX ranked_ratings_rating ON ranked_ratings(rating DESC);
           CREATE TABLE ranked_matches (id INTEGER PRIMARY KEY, room TEXT NOT NULL,
             a TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
             b TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
             started INTEGER NOT NULL, a_left INTEGER, b_left INTEGER, resolved INTEGER);
           CREATE INDEX ranked_matches_open ON ranked_matches(room) WHERE resolved IS NULL;
           CREATE TABLE ranked_history (id INTEGER PRIMARY KEY,
             account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
             room TEXT NOT NULL, opponent TEXT NOT NULL, result TEXT NOT NULL,
             delta INTEGER NOT NULL, rating INTEGER NOT NULL, ended INTEGER NOT NULL);
           CREATE INDEX ranked_history_account ON ranked_history(account_id, ended);`,
    },
  ],
  start: (services) => void ranked(services).listen(),
  routes(router, services) {
    const changes = (id: string) => services.limit(`ranked:${id}`, QUEUE_CHANGES_PER_MINUTE);
    router
      .on('GET', rankedApi.ranked, ({ me }) => ranked(services).view(me()))
      .on('POST', rankedApi.queue, ({ me }) => (changes(me().id), ranked(services).join(me())))
      .on(
        'DELETE',
        rankedApi.queue,
        ({ me }) => (changes(me().id), ranked(services).leave(me().id)),
      );
  },
  tick: every(PAIR_EVERY_MS, (services) => ranked(services).tick()),
  exportData: (accountId, services) => ({
    rating: ranked(services).ratings.of(accountId),
    games: ranked(services).ratings.recent(accountId, Number.MAX_SAFE_INTEGER),
  }),
};
