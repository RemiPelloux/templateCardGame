import { beforeEach, describe, expect, it } from 'vitest';
import type { Player } from '@cardgame/protocol';
import { RuleError } from '@cardgame/engine';
import type { Services } from '../src/core/feature';
import type { MatchFinished } from '../src/core/events';
import { ApiError } from '../src/core/http/errors';
import { BOT_DELAY_MS, ROOM_IDLE_MS } from '../src/features/rooms/model';
import { RoomService } from '../src/features/rooms/room-service';
import { RoomStore } from '../src/features/rooms/room-store';
import { signUp, testServices } from './support';

let services: Services;
let clock: { now: number };
let alice: Player;
let bob: Player;

beforeEach(async () => {
  ({ services, clock } = testServices());
  alice = await signUp(services, 'alice');
  bob = await signUp(services, 'bob');
});

/** Plays the player's first legal command, if it is their move. */
function playFirst(code: string, player: Player) {
  const view = services.rooms.view(code, player);
  const command = view.match?.legal[0];
  if (command) services.rooms.play(code, player, { revision: view.revision, command });
}

describe('lobby', () => {
  it('seats the creator as host, then guests and bots', () => {
    const created = services.rooms.create(alice);
    expect(created).toMatchObject({ isHost: true, you: 0, kind: 'casual' });
    services.rooms.join(created.code, bob);
    const view = services.rooms.seats(created.code, alice, { action: 'addBot' });
    expect(view.seats.map((s) => [s.name, s.bot])).toEqual([
      ['alice', null],
      ['bob', null],
      ['Bot 1', 'basic'],
    ]);
    expect(view.seats[0]!.handle).toBe(`alice#${alice.tag}`);
  });

  it('keeps lobby controls for the host', () => {
    const { code } = services.rooms.create(alice);
    services.rooms.join(code, bob);
    expect(() => services.rooms.seats(code, bob, { action: 'addBot' })).toThrow(ApiError);
    expect(() => services.rooms.start(code, bob, {})).toThrow(/host/);
  });

  it('needs the minimum number of players to deal', () => {
    const { code } = services.rooms.create(alice);
    expect(() => services.rooms.start(code, alice, {})).toThrow(RuleError);
  });
});

describe('a match', () => {
  it('lets the right player move once, with the current revision', () => {
    const { code } = services.rooms.create(alice);
    services.rooms.join(code, bob);
    const dealt = services.rooms.start(code, alice, {});
    const actor = dealt.match!.actors[0] === 0 ? alice : bob;
    const other = actor === alice ? bob : alice;
    const command = services.rooms.view(code, actor).match!.legal[0]!;
    expect(() => services.rooms.play(code, other, { revision: dealt.revision, command })).toThrow(
      /turn/,
    );
    expect(() =>
      services.rooms.play(code, actor, { revision: dealt.revision - 1, command }),
    ).toThrow(/changed/);
    expect(
      services.rooms.play(code, actor, { revision: dealt.revision, command }).match!.version,
    ).toBe(1);
  });

  it('shows each member their own hand only', () => {
    const { code } = services.rooms.create(alice);
    services.rooms.join(code, bob);
    services.rooms.start(code, alice, {});
    const theirs = services.rooms.view(code, bob).match!.state;
    expect(JSON.stringify(services.rooms.view(code, alice))).not.toContain(
      `"${theirs.hand[0]!.id}"`,
    );
  });

  it('plays to the end with a bot, archives the match and announces it', () => {
    const finished: MatchFinished[] = [];
    services.events.on('match.finished', (event) => finished.push(event));
    const { code } = services.rooms.create(alice);
    services.rooms.seats(code, alice, { action: 'addBot' });
    services.rooms.start(code, alice, {});
    for (let i = 0; i < 2000 && services.rooms.view(code, alice).status === 'playing'; i++) {
      clock.now += BOT_DELAY_MS;
      services.rooms.tick();
      playFirst(code, alice);
    }
    expect(services.rooms.view(code, alice).status).toBe('finished');
    expect(services.db.prepare('SELECT COUNT(*) AS n FROM matches').get()).toEqual({ n: 1 });
    expect(finished).toHaveLength(1);
    expect(finished[0]!.seats.map((s) => s.accountId)).toEqual([alice.id, null]);
  });

  it('deals server tables at once with a fixed seed', () => {
    const code = services.rooms.openMatch({ kind: 'daily', players: [alice], bots: 2, seed: 42 });
    const again = services.rooms.openMatch({ kind: 'daily', players: [bob], bots: 2, seed: 42 });
    const first = services.rooms.view(code, alice);
    expect(first.status).toBe('playing');
    expect(first.match!.state.hand).toEqual(services.rooms.view(again, bob).match!.state.hand);
    expect(() => services.rooms.start(code, alice, {})).toThrow(ApiError);
  });

  it('hands a leaving player’s seat to a bot and the room to the next person', () => {
    const { code } = services.rooms.create(alice);
    services.rooms.join(code, bob);
    services.rooms.start(code, alice, {});
    services.rooms.leave(code, alice);
    const view = services.rooms.view(code, bob);
    expect(view.isHost).toBe(true);
    expect(view.seats[0]!.bot).toBe('basic');
  });
});

describe('lifetime', () => {
  it('closes a room when its last person leaves, or when left idle', () => {
    const first = services.rooms.create(alice);
    services.rooms.leave(first.code, alice);
    expect(services.rooms.size).toBe(0);
    services.rooms.create(bob);
    clock.now += ROOM_IDLE_MS + 1;
    services.rooms.tick();
    expect(services.rooms.size).toBe(0);
  });

  it('restores open rooms after a restart', () => {
    const { code } = services.rooms.create(alice);
    const restarted = new RoomService({
      store: new RoomStore(services.db),
      events: null,
      now: () => clock.now,
    });
    expect(restarted.view(code, alice).seats[0]!.name).toBe('alice');
    expect(services.rooms.roomsOf(alice.id)).toEqual([{ code, kind: 'casual' }]);
  });

  it('announces each change to live listeners', () => {
    const { code } = services.rooms.create(alice);
    const revisions: number[] = [];
    services.rooms.live.subscribe(code, (revision) => revisions.push(revision));
    services.rooms.join(code, bob);
    services.rooms.leave(code, bob);
    expect(revisions).toHaveLength(2);
  });
});
