import type { RoomKind } from '@cardgame/protocol';
import type { GameMatch } from '../features/rooms/model';

/** A finished match, as features that react to results (progression, Elo, daily) receive it. */
export type MatchFinished = {
  room: string;
  kind: RoomKind;
  match: GameMatch;
  /** In seat order: the account behind each seat, or null for a bot. */
  seats: { accountId: string | null; bot: string | null; name: string }[];
  ended: number;
};

/** Everything a feature may announce to others. Add an entry to publish a new event. */
export type EventMap = {
  'account.created': { accountId: string };
  'account.deleted': { accountId: string };
  'match.finished': MatchFinished;
};

type Handler<K extends keyof EventMap> = (payload: EventMap[K]) => void;

/**
 * How features talk without importing each other: rooms announce `match.finished`, progression,
 * Elo and the daily challenge listen. Handlers run synchronously, in subscription order; one
 * that throws is logged and never stops the others or the move that triggered it.
 */
export class DomainEvents {
  private handlers = new Map<keyof EventMap, Handler<never>[]>();

  on<K extends keyof EventMap>(name: K, handler: Handler<K>) {
    this.handlers.set(name, [...(this.handlers.get(name) ?? []), handler as Handler<never>]);
  }

  emit<K extends keyof EventMap>(name: K, payload: EventMap[K]) {
    for (const handler of this.handlers.get(name) ?? [])
      try {
        (handler as Handler<K>)(payload);
      } catch (error) {
        console.error(
          JSON.stringify({
            event: 'handler-error',
            name,
            message: String((error as Error)?.stack ?? error),
          }),
        );
      }
  }
}
