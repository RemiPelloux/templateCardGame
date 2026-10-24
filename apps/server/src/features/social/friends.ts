import type { Player } from '@cardgame/protocol';
import type { Services } from '../../core/feature';
import { ApiError } from '../../core/http/errors';
import { MAX_FRIENDS, MAX_INCOMING, MAX_OUTGOING, REQUESTS_PER_MINUTE } from './limits';
import { memberByHandle, spend } from './people';
import type { SocialStore } from './store';

const FORBIDDEN = 403;
const CONFLICT = 409;
type Target = { me: Player; handle: unknown };
type Pair = { a: string; b: string };

/**
 * Refused the same way whether the other side blocked us or simply has no room left, so a
 * block is never revealed to the person blocked.
 */
const unavailable = () =>
  new ApiError('You cannot send this player a request.', 'CANNOT_REQUEST', FORBIDDEN);

/** Friend requests and friendships, between members found by handle. */
export class Friends {
  constructor(
    private services: Services,
    private store: SocialStore,
  ) {}

  private pairWith(target: Target) {
    const other = memberByHandle(this.services, target);
    return { a: target.me.id, b: other.id };
  }

  /** Sends a request; if they already asked us, this accepts theirs instead. */
  request(target: Target) {
    spend(this.services, { key: `request:${target.me.id}`, perMinute: REQUESTS_PER_MINUTE });
    const pair = this.pairWith(target);
    if (this.store.hasBlocked(pair))
      throw new ApiError('You blocked this player.', 'PLAYER_BLOCKED', CONFLICT);
    if (this.store.hasBlocked({ a: pair.b, b: pair.a })) throw unavailable();
    if (this.store.areFriends(pair))
      throw new ApiError('You are already friends.', 'ALREADY_FRIENDS', CONFLICT);
    if (this.store.hasRequest({ a: pair.b, b: pair.a })) return this.befriend(pair);
    if (this.store.hasRequest(pair)) return;
    if (this.store.outgoingCount(pair.a) >= MAX_OUTGOING)
      throw new ApiError('Too many requests are waiting.', 'PENDING_LIMIT', CONFLICT, {
        max: MAX_OUTGOING,
      });
    if (this.store.incomingCount(pair.b) >= MAX_INCOMING) throw unavailable();
    this.checkRoom(pair);
    this.store.request(pair, this.services.now());
  }

  /** Accepts the request `handle` sent us. */
  accept(target: Target) {
    const pair = this.pairWith(target);
    if (!this.store.hasRequest({ a: pair.b, b: pair.a }))
      throw new ApiError('This request no longer exists.', 'NO_REQUEST', CONFLICT);
    this.befriend(pair);
  }

  /** Declines their request or cancels ours: either way nothing stays pending between us. */
  dismiss(target: Target) {
    this.store.dropRequests(this.pairWith(target));
  }

  remove(target: Target) {
    const pair = this.pairWith(target);
    this.services.db.transaction(() => {
      this.store.unfriend(pair);
      this.store.dropInvites(pair);
    })();
  }

  private befriend(pair: Pair) {
    this.checkRoom(pair);
    this.services.db.transaction(() => this.store.befriend(pair, this.services.now()))();
  }

  private checkRoom(pair: Pair) {
    if (this.store.friendCount(pair.a) >= MAX_FRIENDS)
      throw new ApiError('Your friends list is full.', 'FRIEND_LIMIT', CONFLICT, {
        max: MAX_FRIENDS,
      });
    if (this.store.friendCount(pair.b) >= MAX_FRIENDS)
      throw new ApiError('Their friends list is full.', 'THEIR_FRIEND_LIMIT', CONFLICT);
  }
}
