import { beforeEach, describe, expect, it } from 'vitest';
import { handleOf, REPORT_NOTE_MAX_LENGTH, type Player } from '@cardgame/protocol';
import {
  DAY_MS,
  INVITE_TTL_MS,
  ONLINE_WINDOW_MS,
  REPORTS_PER_DAY,
} from '../src/features/social/limits';
import { fileReport } from '../src/features/social/reports';
import { PASSWORD } from './support';
import { members, socialWorld } from './social-support';

let world: Awaited<ReturnType<typeof socialWorld>>;
beforeEach(async () => {
  world = await socialWorld();
});

const refused = (code: string) => expect.objectContaining({ code });
const reports = () => world.services.db.prepare('SELECT * FROM reports').all();
const report = (me: Player, body: Record<string, unknown>) =>
  fileReport(world.services, { me, body });

describe('blocks', () => {
  it('ends the friendship, requests and invites, and stops requests both ways', () => {
    const { services, social, ada, bob, cyd, on, befriend } = world;
    befriend(ada, bob);
    const { code } = services.rooms.create(bob);
    social.invites.send({ ...on(bob, ada), room: code });
    social.friends.request(on(cyd, ada));
    social.blocks.block(on(ada, bob));
    social.blocks.block(on(ada, cyd));
    expect(social.overview(ada.id)).toMatchObject({ friends: [], incoming: [], invites: [] });
    expect(social.overview(bob.id).friends).toEqual([]);
    expect(social.overview(ada.id).blocked.map((p) => p.name)).toEqual(['bob', 'cyd']);
    expect(() => social.friends.request(on(ada, bob))).toThrow(refused('PLAYER_BLOCKED'));
    expect(() => social.friends.request(on(bob, ada))).toThrow(refused('CANNOT_REQUEST'));
    expect(() => social.invites.send({ ...on(bob, ada), room: code })).toThrow(
      refused('NOT_FRIENDS'),
    );
  });

  it('lets requests flow again once lifted', () => {
    const { social, ada, bob, on } = world;
    social.blocks.block(on(bob, ada));
    social.blocks.unblock(on(bob, ada));
    social.friends.request(on(ada, bob));
    expect(social.overview(bob.id).incoming.map((p) => p.name)).toEqual(['ada']);
  });
});

describe('presence', () => {
  it('shows friends online, playing or offline, and honours appear offline', () => {
    const { services, clock, social, ada, bob, befriend } = world;
    befriend(ada, bob);
    const bobAs = () => social.overview(ada.id).friends[0]!.presence;
    expect(bobAs()).toBe('offline');
    social.pulse(bob.id);
    expect(bobAs()).toBe('online');
    services.rooms.create(bob);
    expect(bobAs()).toBe('playing');
    social.presence.setAppearOffline(bob.id, true);
    expect(bobAs()).toBe('offline');
    social.presence.setAppearOffline(bob.id, false);
    clock.now += ONLINE_WINDOW_MS + 1;
    expect(bobAs()).toBe('offline');
  });
});

describe('table invites', () => {
  it('invites a friend to my table, lists it with the inviter, and expires it', () => {
    const { services, clock, social, ada, bob, on, befriend } = world;
    befriend(ada, bob);
    const { code } = services.rooms.create(ada);
    social.invites.send({ ...on(ada, bob), room: code.toLowerCase() });
    expect(social.overview(bob.id).invites).toMatchObject([
      { from: { name: 'ada', tag: ada.tag }, room: code },
    ]);
    expect(social.pulse(bob.id).invites).toBe(1);
    clock.now += INVITE_TTL_MS;
    expect(social.overview(bob.id).invites).toEqual([]);
    social.invites.sweep();
    expect(services.db.prepare('SELECT COUNT(*) AS n FROM table_invites').get()).toEqual({ n: 0 });
  });

  it('refuses strangers, tables I am not at and server-dealt tables', () => {
    const { services, social, ada, bob, cyd, on, befriend } = world;
    befriend(ada, bob);
    const { code } = services.rooms.create(ada);
    expect(() => social.invites.send({ ...on(ada, cyd), room: code })).toThrow(
      refused('NOT_FRIENDS'),
    );
    expect(() => social.invites.send({ ...on(bob, ada), room: code })).toThrow(
      refused('NOT_AT_TABLE'),
    );
    const daily = services.rooms.openMatch({ kind: 'daily', players: [ada], bots: 1 });
    expect(() => social.invites.send({ ...on(ada, bob), room: daily })).toThrow(
      refused('CANNOT_INVITE'),
    );
    services.rooms.join(code, bob);
    expect(() => social.invites.send({ ...on(ada, bob), room: code })).toThrow(
      refused('ALREADY_AT_TABLE'),
    );
  });

  it('drops an invite once dismissed or once the inviter leaves', () => {
    const { services, social, ada, bob, on, befriend } = world;
    befriend(ada, bob);
    const first = services.rooms.create(ada).code;
    social.invites.send({ ...on(ada, bob), room: first });
    social.invites.dismiss(ada.id, social.overview(bob.id).invites[0]!.id);
    expect(social.overview(bob.id).invites).toHaveLength(1);
    social.invites.dismiss(bob.id, social.overview(bob.id).invites[0]!.id);
    expect(social.overview(bob.id).invites).toEqual([]);
    social.invites.send({ ...on(ada, bob), room: first });
    services.rooms.leave(first, ada);
    expect(social.overview(bob.id).invites).toEqual([]);
  });
});

describe('reports', () => {
  it('stores one report per reporter, target and reason each day', () => {
    const { clock, ada, bob } = world;
    const send = (reason: string) => {
      report(ada, { handle: handleOf(bob), reason, note: ' rude ', room: 'abcde' });
      return reports().length;
    };
    expect(send('harassment')).toBe(1);
    expect(send('harassment')).toBe(1);
    expect(send('spam')).toBe(2);
    clock.now += DAY_MS;
    expect(send('harassment')).toBe(3);
    expect(reports()[0]).toMatchObject({ note: 'rude', room: 'ABCDE', reason: 'harassment' });
  });

  it('refuses unknown reasons, long notes and bad table codes', () => {
    const { ada, bob } = world;
    const handle = handleOf(bob);
    const note = 'x'.repeat(REPORT_NOTE_MAX_LENGTH + 1);
    expect(() => report(ada, { handle, reason: 'boring' })).toThrow(refused('INVALID_REASON'));
    expect(() => report(ada, { handle, reason: 'spam', note })).toThrow(refused('NOTE_TOO_LONG'));
    expect(() => report(ada, { handle, reason: 'spam', room: 'O0' })).toThrow(
      refused('INVALID_ROOM'),
    );
  });

  it('caps the reports one member files in a day', async () => {
    const { services, ada } = world;
    const targets = await members(
      services,
      Array.from({ length: REPORTS_PER_DAY + 1 }, (_, i) => `target_${i}`),
    );
    targets
      .slice(0, REPORTS_PER_DAY)
      .forEach((t) => report(ada, { handle: handleOf(t), reason: 'spam' }));
    expect(() => report(ada, { handle: handleOf(targets.at(-1)!), reason: 'spam' })).toThrow(
      refused('REPORT_LIMIT'),
    );
  });
});

describe('account deletion', () => {
  it('clears every social row of the member but keeps reports, pseudonymised', async () => {
    const { services, social, ada, bob, cyd, on, befriend } = world;
    befriend(ada, bob);
    social.friends.request(on(bob, cyd));
    social.blocks.block(on(bob, world.cyd));
    social.pulse(bob.id);
    social.invites.send({ ...on(ada, bob), room: services.rooms.create(ada).code });
    report(ada, { handle: handleOf(bob), reason: 'cheating' });
    await services.accounts.delete(bob.id, PASSWORD);
    expect(reports()).toMatchObject([{ reporter_id: ada.id, target_id: null }]);
    for (const table of ['friendships', 'friend_requests', 'blocks', 'presence', 'table_invites'])
      expect(services.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).toEqual({ n: 0 });
  });

  it("exports the member's own social data", () => {
    const { social, ada, bob, befriend } = world;
    befriend(ada, bob);
    report(ada, { handle: handleOf(bob), reason: 'spam' });
    expect(social.exportData(ada.id)).toMatchObject({
      friends: [{ name: 'bob' }],
      reportsFiled: [{ reason: 'spam' }],
      settings: { appearOffline: false },
    });
  });
});
