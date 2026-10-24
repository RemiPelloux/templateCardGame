import type { SocialOverview, SocialPlayer, SocialPulse } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { Blocks } from './blocks';
import { Friends } from './friends';
import { Invites } from './invites';
import { publicOf } from './people';
import { PresenceBook } from './presence';
import { SocialStore } from './store';

type Person = SocialPlayer & { id: string; at: number };

/** The social feature's parts, built once at start-up and shared by its routes and tick. */
export class SocialService {
  readonly store: SocialStore;
  readonly friends: Friends;
  readonly blocks: Blocks;
  readonly presence: PresenceBook;
  readonly invites: Invites;

  constructor(private services: Services) {
    this.store = new SocialStore(services.db);
    this.friends = new Friends(services, this.store);
    this.blocks = new Blocks(services, this.store);
    this.presence = new PresenceBook(services);
    this.invites = new Invites(services, this.store);
  }

  /** Everything the friends screen shows. Presence is only ever computed for friends. */
  overview(id: string): SocialOverview {
    const dated = ({ id: _id, at, ...person }: Person) => ({ ...person, created: at });
    return {
      friends: this.people(this.store.friends(id))
        .map(({ id: friend, at, ...person }) => ({
          ...person,
          presence: this.presence.of(friend),
          since: at,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      incoming: this.people(this.store.incoming(id)).map(dated),
      outgoing: this.people(this.store.outgoing(id)).map(dated),
      blocked: this.people(this.store.blocked(id)).map(({ name, tag }) => ({ name, tag })),
      invites: this.invites.received(id),
      settings: this.presence.settings(id),
    };
  }

  /** Marks the member online and returns what their navigation badge counts. */
  pulse(id: string): SocialPulse {
    this.presence.ping(id);
    return { requests: this.store.incomingCount(id), invites: this.invites.received(id).length };
  }

  /** The member's own social data. Reports about them stay with moderation. */
  exportData(id: string) {
    const { friends, incoming, outgoing, blocked, invites, settings } = this.overview(id);
    const reports = this.services.db
      .prepare('SELECT reason, note, room, created FROM reports WHERE reporter_id = ?')
      .all(id);
    return {
      friends: friends.map(({ presence: _presence, ...friend }) => friend),
      incoming,
      outgoing,
      blocked,
      invitesReceived: invites,
      settings,
      reportsFiled: reports,
    };
  }

  /** Account ids → public faces (handles), dropping any account that vanished meanwhile. */
  private people(rows: { id: string; at: number }[]): Person[] {
    return rows.flatMap((row) => {
      const player = this.services.accounts.player(row.id);
      return player ? [{ ...row, ...publicOf(player) }] : [];
    });
  }
}
