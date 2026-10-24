import { beforeEach, describe, expect, it } from 'vitest';
import { profileApi, type Player, type ProfileView } from '@cardgame/protocol';
import type { MatchFinished } from '../src/core/events';
import type { Services } from '../src/core/feature';
import { Router, type Context } from '../src/core/http/router';
import { profileFeature } from '../src/features/profile';
import { progressionFeature } from '../src/features/progression';
import type { GameMatch } from '../src/features/rooms/model';
import { signUp, testServices } from './support';

let services: Services;
let router: Router;
let ada: Player;
let bob: Player;

beforeEach(async () => {
  ({ services } = testServices());
  progressionFeature.start!(services);
  router = new Router();
  profileFeature.routes!(router, services);
  ada = await signUp(services, 'ada');
  bob = await signUp(services, 'bob');
});

const finish = (seed: number, kind: MatchFinished['kind']): MatchFinished => ({
  room: `R${seed}`,
  kind,
  match: {
    seed,
    version: 1,
    log: [],
    outcome: { winners: [0], scores: [5, 0] },
  } as unknown as GameMatch,
  seats: [
    { accountId: ada.id, bot: null, name: 'ada' },
    { accountId: null, bot: 'basic', name: 'Bot' },
  ],
  ended: services.now() + seed,
});

/** Calls a route as `viewer`, the way the HTTP layer would. */
function get(path: string, viewer: Player) {
  const found = router.match('GET', path)!;
  const ctx = { params: found.params, player: viewer, me: () => viewer } as unknown as Context;
  return found.handler(ctx) as ProfileView;
}

describe('profiles', () => {
  it('shows level, stats by kind, achievements and recent matches', () => {
    services.events.emit('match.finished', finish(1, 'casual'));
    services.events.emit('match.finished', finish(2, 'daily'));
    const profile = get(profileApi.of(`ada#${ada.tag}`), bob);
    expect(profile.handle).toBe(`ada#${ada.tag}`);
    expect(profile.equipped.frame).toBe('frame-none');
    expect(profile.stats).toEqual({
      matches: 2,
      wins: 2,
      byKind: { casual: { matches: 1, wins: 1 }, daily: { matches: 1, wins: 1 } },
    });
    expect(profile.recent.map((m) => m.room)).toEqual(['R2', 'R1']);
    expect(profile.achievements.find((a) => a.id === 'first-win')?.unlocked).not.toBeNull();
    expect(profile.level.total).toBeGreaterThan(0);
  });

  it('answers the member’s own profile and refuses unknown handles', () => {
    expect(get(profileApi.mine, bob).stats.matches).toBe(0);
    expect(() => get(profileApi.of('nobody-1234'), bob)).toThrow(/No player/);
  });
});
