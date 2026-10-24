import { beforeEach, describe, expect, it } from 'vitest';
import { ELO_START } from '@cardgame/meta';
import type { Player } from '@cardgame/protocol';
import type { Services } from '../src/core/feature';
import { BASE_GAP, GAP_GROWTH, QUEUE_STALE_MS } from '../src/features/ranked/queue';
import { RankedService } from '../src/features/ranked/ranked-service';
import { BOT_DELAY_MS } from '../src/features/rooms/model';
import { signUp, testServices } from './support';

const SECOND = 1000;
const MAX_STEPS = 2000;

let services: Services;
let clock: { now: number };
let ranked: RankedService;

beforeEach(() => {
  ({ services, clock } = testServices());
  ranked = new RankedService(services).listen();
});

/** A member with a given rating (as if they had played before). */
async function member(name: string, rating = ELO_START) {
  const player = await signUp(services, name);
  services.db.prepare('INSERT INTO ranked_ratings VALUES (?, ?, 0, 0)').run(player.id, rating);
  return player;
}

function matchedRoom(player: Player) {
  const status = ranked.status(player.id);
  if (status.state !== 'matched') throw new Error(`${player.name} is ${status.state}`);
  return status.room;
}

/** Plays the table to its end: every person seated plays their first legal move, bots on ticks. */
function playOut(code: string, players: Player[]) {
  const playing = () => services.rooms.view(code, players[0]!).status === 'playing';
  for (let i = 0; i < MAX_STEPS && playing(); i++) {
    clock.now += BOT_DELAY_MS;
    services.rooms.tick();
    for (const player of players) {
      const view = services.rooms.view(code, player);
      const command = view.match?.legal[0];
      if (command) services.rooms.play(code, player, { revision: view.revision, command });
    }
  }
  expect(playing()).toBe(false);
}

async function duel() {
  const ada = await member('ada');
  const bob = await member('bob');
  ranked.join(ada);
  ranked.join(bob);
  ranked.tick();
  return { ada, bob, room: matchedRoom(ada) };
}

describe('matchmaking', () => {
  it('pairs the closest ratings, and widens the gap with waiting time', async () => {
    const low = await member('low', 1000);
    const near = await member('near', 1050);
    const high = await member('high', 1500);
    const higher = await member('higher', 1500 + 2 * BASE_GAP);
    for (const player of [low, high, near, higher]) ranked.join(player);
    ranked.tick();
    expect(matchedRoom(low)).toBe(matchedRoom(near));
    expect(ranked.status(high.id)).toMatchObject({ state: 'searching', gap: BASE_GAP });
    clock.now += (BASE_GAP / GAP_GROWTH) * SECOND - SECOND;
    ranked.tick();
    expect(ranked.status(higher.id).state).toBe('searching');
    clock.now += SECOND;
    ranked.tick();
    expect(matchedRoom(high)).toBe(matchedRoom(higher));
    expect(services.rooms.view(matchedRoom(high), high).seats.map((s) => s.bot)).toEqual([
      null,
      null,
    ]);
  });

  it('drops members who stop polling, and lets members leave', async () => {
    const ada = await member('ada');
    const bob = await member('bob');
    ranked.join(ada);
    clock.now += QUEUE_STALE_MS + SECOND;
    ranked.join(bob);
    ranked.tick();
    expect(ranked.status(ada.id)).toEqual({ state: 'idle' });
    expect(ranked.leave(bob.id)).toEqual({ state: 'idle' });
    expect(ranked.queue.size).toBe(0);
  });

  it('keeps a matched member at their table rather than queueing again', async () => {
    const { ada, room } = await duel();
    expect(ranked.join(ada)).toEqual({ state: 'matched', room });
    expect(ranked.queue.size).toBe(0);
  });
});

describe('rating', () => {
  it('moves both ratings by the same amount, in opposite directions', async () => {
    const { ada, bob, room } = await duel();
    playOut(room, [ada, bob]);
    const [a, b] = [ranked.view(ada), ranked.view(bob)];
    expect(a.rating + b.rating).toBe(2 * ELO_START);
    expect(a.games).toBe(1);
    expect(a.provisional).toBe(true);
    expect(a.recent[0]).toMatchObject({ room, opponent: `bob#${bob.tag}` });
    expect(a.recent[0]!.delta).toBe(-b.recent[0]!.delta);
    expect(a.leaderboard.top).toHaveLength(2);
    expect(a.queue).toEqual({ state: 'idle' });
  });

  it('counts leaving a duel as a loss, whatever the bot does next', async () => {
    const { ada, bob, room } = await duel();
    services.rooms.leave(room, ada);
    ranked.tick();
    playOut(room, [bob]);
    expect(ranked.view(ada).recent[0]!.result).toBe('loss');
    expect(ranked.view(bob).recent[0]!.result).toBe('win');
    expect(ranked.view(bob).rating).toBeGreaterThan(ELO_START);
  });

  it('rates a duel both left: the first to leave loses', async () => {
    const { ada, bob, room } = await duel();
    services.rooms.leave(room, bob);
    ranked.tick();
    clock.now += SECOND;
    services.rooms.leave(room, ada);
    ranked.tick();
    expect(ranked.view(bob).recent[0]!.result).toBe('loss');
    expect(ranked.view(ada).wins).toBe(1);
  });

  it('forgets a member’s rating and games when the account is deleted', async () => {
    const { ada, bob, room } = await duel();
    playOut(room, [ada, bob]);
    services.db.prepare('DELETE FROM accounts WHERE id = ?').run(ada.id);
    const left = (table: string) =>
      services.db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE account_id = ?`).get(ada.id);
    expect(left('ranked_ratings')).toEqual({ n: 0 });
    expect(left('ranked_history')).toEqual({ n: 0 });
  });
});
