import { useState } from 'react';
import { handleOf, socialApi } from '@cardgame/protocol';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { useAction } from '../../ui/useAction';
import type { RoomSlotProps } from '../rooms/slots';
import { PresenceDot } from './PresenceDot';
import { useSocialOverview, useSocialWrite } from './useSocial';
import './friends.css';

/**
 * In a casual lobby I sit at: my friends who are around and not seated yet, each with an
 * Invite button. Hidden for guests, watchers, server-dealt tables and people with no friends.
 */
export function LobbyInvites({ room }: RoomSlotProps) {
  const t = useT();
  const { data } = useSocialOverview();
  const write = useSocialWrite();
  const { busy, error, run, clearError } = useAction();
  const [invited, setInvited] = useState<ReadonlySet<string>>(new Set());
  if (room.kind !== 'casual' || room.status !== 'lobby' || room.you === null) return null;
  if (!data || data.friends.length === 0) return null;
  const seated = new Set(room.seats.map((seat) => seat.handle));
  const around = data.friends.filter((f) => f.presence !== 'offline' && !seated.has(handleOf(f)));
  const invite = (handle: string) =>
    void run(() => write(socialApi.invite, { handle, room: room.code })).then(
      (ok) => ok && setInvited((done) => new Set(done).add(handle)),
    );
  return (
    <section className="lobby-invites" aria-labelledby="lobby-invites">
      <h2 id="lobby-invites">{t('friends.invite.lobbyTitle')}</h2>
      {around.length === 0 && <p className="muted">{t('friends.invite.noneOnline')}</p>}
      <ul className="list">
        {around.map((friend) => {
          const handle = handleOf(friend);
          return (
            <li key={handle} className="list__row">
              <span className="friend">
                <strong>{friend.name}</strong>
                <PresenceDot presence={friend.presence} />
              </span>
              <Button
                variant="secondary"
                onClick={() => invite(handle)}
                disabled={busy || invited.has(handle)}
              >
                {invited.has(handle) ? t('friends.invite.sent') : t('friends.invite.action')}
              </Button>
            </li>
          );
        })}
      </ul>
      <Notice message={error} onDismiss={clearError} />
    </section>
  );
}
