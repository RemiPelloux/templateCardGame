import { describe, expect, it } from 'vitest';
import { RuleError } from '@cardgame/engine';
import { ApiError } from '../src/http/errors';
import { BOT_DELAY_MS, ROOM_IDLE_MS } from '../src/rooms/model';
import { RoomService } from '../src/rooms/room-service';
import { alice, bob, rooms } from './support';

/** Plays the player's first legal command, if it is their move. */
function playFirst(service: RoomService, code: string, player: typeof alice) {
  const view = service.view(code, player);
  const command = view.match?.legal[0];
  if (command) service.play(code, player, { revision: view.revision, command });
}

describe('lobby', () => {
  it('seats the creator as host, then guests and bots', () => {
    const { service } = rooms();
    const created = service.create(alice);
    expect(created.isHost).toBe(true);
    expect(created.you).toBe(0);
    service.join(created.code, bob);
    const view = service.seats(created.code, alice, { action: 'addBot' });
    expect(view.seats.map((s) => [s.name, s.bot])).toEqual([
      ['Alice', null],
      ['Bob', null],
      ['Bot 1', 'basic'],
    ]);
  });

  it('keeps lobby controls for the host', () => {
    const { service } = rooms();
    const { code } = service.create(alice);
    service.join(code, bob);
    expect(() => service.seats(code, bob, { action: 'addBot' })).toThrow(ApiError);
    expect(() => service.start(code, bob, {})).toThrow(/host/);
  });

  it('needs the minimum number of players to deal', () => {
    const { service } = rooms();
    const { code } = service.create(alice);
    expect(() => service.start(code, alice, {})).toThrow(RuleError);
  });

  it('refuses an unknown room', () => {
    expect(() => rooms().service.view('ZZZZZ', alice)).toThrow(/closed/);
  });
});

describe('a match', () => {
  it('lets the right player move once, with the current revision', () => {
    const { service } = rooms();
    const { code } = service.create(alice);
    service.join(code, bob);
    const dealt = service.start(code, alice, {});
    expect(dealt.status).toBe('playing');
    const actor = dealt.match!.actors[0] === 0 ? alice : bob;
    const other = actor === alice ? bob : alice;
    const command = service.view(code, actor).match!.legal[0]!;
    expect(() => service.play(code, other, { revision: dealt.revision, command })).toThrow(/turn/);
    expect(() => service.play(code, actor, { revision: dealt.revision - 1, command })).toThrow(
      /changed/,
    );
    expect(service.play(code, actor, { revision: dealt.revision, command }).match!.version).toBe(1);
  });

  it('shows each member their own hand only', () => {
    const { service } = rooms();
    const { code } = service.create(alice);
    service.join(code, bob);
    service.start(code, alice, {});
    const mine = service.view(code, alice).match!.state;
    const theirs = service.view(code, bob).match!.state;
    expect(mine.hand).not.toEqual(theirs.hand);
    expect(JSON.stringify(service.view(code, alice))).not.toContain(theirs.hand[0]!.id + '"');
  });

  it('has bots move after their delay, and plays a full match to the end', () => {
    const { service, clock, db } = rooms();
    const { code } = service.create(alice);
    service.seats(code, alice, { action: 'addBot' });
    service.start(code, alice, {});
    for (let i = 0; i < 2000 && service.view(code, alice).status === 'playing'; i++) {
      clock.now += BOT_DELAY_MS;
      service.tick();
      playFirst(service, code, alice);
    }
    expect(service.view(code, alice).status).toBe('finished');
    expect(db.prepare('SELECT COUNT(*) AS n FROM matches').get()).toEqual({ n: 1 });
  });

  it('hands a leaving player’s seat to a bot and the room to the next person', () => {
    const { service } = rooms();
    const { code } = service.create(alice);
    service.join(code, bob);
    service.start(code, alice, {});
    service.leave(code, alice);
    const view = service.view(code, bob);
    expect(view.isHost).toBe(true);
    expect(view.seats[0]!.bot).toBe('basic');
  });
});

describe('lifetime', () => {
  it('closes a room when its last person leaves, or when left idle', () => {
    const { service, clock } = rooms();
    const first = service.create(alice);
    service.leave(first.code, alice);
    expect(service.size).toBe(0);
    service.create(bob);
    clock.now += ROOM_IDLE_MS + 1;
    service.tick();
    expect(service.size).toBe(0);
  });

  it('restores open rooms after a restart', () => {
    const { service, store } = rooms();
    const { code } = service.create(alice);
    const restarted = new RoomService(store);
    expect(restarted.view(code, alice).seats[0]!.name).toBe('Alice');
  });

  it('announces each change to live listeners', () => {
    const { service } = rooms();
    const { code } = service.create(alice);
    const revisions: number[] = [];
    service.events.subscribe(code, (revision) => revisions.push(revision));
    service.join(code, bob);
    service.leave(code, bob);
    expect(revisions).toHaveLength(2);
  });
});
