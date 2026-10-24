import type { Player } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { ApiError } from '../../core/http/errors';
import { MAX_BLOCKS } from './limits';
import { memberByHandle } from './people';
import type { SocialStore } from './store';

const CONFLICT = 409;
type Target = { me: Player; handle: unknown };

/**
 * Blocking a member ends everything between the two at once: the friendship, pending requests
 * both ways and table invites both ways. While the block lasts neither side can send the other
 * a request or an invite, and since they are no longer friends neither sees the other's presence.
 */
export class Blocks {
  constructor(
    private services: Services,
    private store: SocialStore,
  ) {}

  block(target: Target) {
    const other = memberByHandle(this.services, target);
    const pair = { a: target.me.id, b: other.id };
    if (this.store.hasBlocked(pair)) return;
    if (this.store.blockCount(pair.a) >= MAX_BLOCKS)
      throw new ApiError('Your block list is full.', 'BLOCK_LIMIT', CONFLICT, { max: MAX_BLOCKS });
    this.services.db.transaction(() => {
      this.store.unfriend(pair);
      this.store.dropRequests(pair);
      this.store.dropInvites(pair);
      this.store.block(pair, this.services.now());
    })();
  }

  unblock(target: Target) {
    const other = memberByHandle(this.services, target);
    this.store.unblock({ a: target.me.id, b: other.id });
  }
}
