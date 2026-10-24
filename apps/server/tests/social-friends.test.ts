import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_FRIENDS, MAX_OUTGOING } from '../src/features/social/limits';
import { members, socialWorld } from './social-support';

const MINUTE_MS = 60_000;

let world: Awaited<ReturnType<typeof socialWorld>>;
beforeEach(async () => {
  world = await socialWorld();
});

const names = (list: { name: string }[]) => list.map((p) => p.name);

describe('friend requests', () => {
  it('sends, lists both sides and accepts', () => {
    const { social, ada, bob, on } = world;
    social.friends.request(on(ada, bob));
    expect(names(social.overview(ada.id).outgoing)).toEqual(['bob']);
    expect(names(social.overview(bob.id).incoming)).toEqual(['ada']);
    expect(social.pulse(bob.id).requests).toBe(1);
    social.friends.accept(on(bob, ada));
    expect(names(social.overview(ada.id).friends)).toEqual(['bob']);
    expect(names(social.overview(bob.id).friends)).toEqual(['ada']);
    expect(social.overview(bob.id).incoming).toEqual([]);
  });

  it('never sends account ids to the other side', () => {
    const { social, ada, bob, on, befriend } = world;
    befriend(ada, bob);
    social.friends.request(on(ada, world.cyd));
    const text = JSON.stringify([social.overview(ada.id), social.overview(world.cyd.id)]);
    expect(text).not.toContain(bob.id);
    expect(text).not.toContain(ada.id);
  });

  it('accepts at once when the other side had already asked', () => {
    const { social, ada, bob, on } = world;
    social.friends.request(on(ada, bob));
    social.friends.request(on(bob, ada));
    expect(names(social.overview(ada.id).friends)).toEqual(['bob']);
  });

  it('declines, cancels and removes', () => {
    const { social, ada, bob, on, befriend } = world;
    social.friends.request(on(ada, bob));
    social.friends.dismiss(on(bob, ada));
    expect(social.overview(ada.id).outgoing).toEqual([]);
    social.friends.request(on(ada, bob));
    social.friends.dismiss(on(ada, bob));
    expect(social.overview(bob.id).incoming).toEqual([]);
    befriend(ada, bob);
    social.friends.remove(on(bob, ada));
    expect(social.overview(ada.id).friends).toEqual([]);
  });

  it('refuses unknown handles, oneself, friends again and stale accepts', () => {
    const { social, ada, bob, on, befriend } = world;
    expect(() => social.friends.request({ me: ada, handle: 'nobody#1234' })).toThrow(
      expect.objectContaining({ code: 'UNKNOWN_PLAYER' }),
    );
    expect(() => social.friends.request({ me: ada, handle: 42 })).toThrow(
      expect.objectContaining({ code: 'UNKNOWN_PLAYER' }),
    );
    expect(() => social.friends.request(on(ada, ada))).toThrow(
      expect.objectContaining({ code: 'SELF_TARGET' }),
    );
    expect(() => social.friends.accept(on(ada, bob))).toThrow(
      expect.objectContaining({ code: 'NO_REQUEST' }),
    );
    befriend(ada, bob);
    expect(() => social.friends.request(on(ada, bob))).toThrow(
      expect.objectContaining({ code: 'ALREADY_FRIENDS' }),
    );
  });
});

describe('limits', () => {
  it('caps pending requests and the size of a friends list', async () => {
    const { services, social, ada, on } = world;
    const others = await members(
      services,
      Array.from({ length: MAX_OUTGOING + 1 }, (_, i) => `member_${i}`),
    );
    for (const other of others.slice(0, MAX_OUTGOING)) {
      world.clock.now += MINUTE_MS; // stays under the per-minute budget for adding by handle
      social.friends.request(on(ada, other));
    }
    expect(() => social.friends.request(on(ada, others[MAX_OUTGOING]!))).toThrow(
      expect.objectContaining({ code: 'PENDING_LIMIT' }),
    );
    const insert = services.db.prepare('INSERT INTO friendships VALUES (?, ?, 0)');
    services.db.prepare('DELETE FROM friend_requests').run();
    // Placeholder friends without accounts: only the count matters here.
    services.db.pragma('foreign_keys = OFF');
    for (let i = 0; i < MAX_FRIENDS; i++) insert.run(ada.id, `${i}`);
    services.db.pragma('foreign_keys = ON');
    expect(() => social.friends.request(on(ada, world.bob))).toThrow(
      expect.objectContaining({ code: 'FRIEND_LIMIT' }),
    );
    expect(() => social.friends.request(on(world.bob, ada))).toThrow(
      expect.objectContaining({ code: 'THEIR_FRIEND_LIMIT' }),
    );
  });

  it('rate-limits adding by handle', () => {
    const { social, ada, on } = world;
    const attempt = () => social.friends.request(on(ada, world.bob));
    expect(() => {
      for (let i = 0; i < 100; i++) attempt();
    }).toThrow(expect.objectContaining({ code: 'RATE_LIMITED' }));
  });
});
