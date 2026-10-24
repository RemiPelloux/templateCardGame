import { roomApi, socialApi, type RoomView, type TableInviteView } from '@cardgame/protocol';
import { navigate } from '../../app/router';
import { useT } from '../../i18n/I18nProvider';
import { http } from '../../net/http';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { useAction } from '../../ui/useAction';
import { useSocialWrite } from './useSocial';

/** Tables friends invited me to: Join takes the seat through the rooms API, then opens it. */
export function InvitesSection({ invites }: { invites: TableInviteView[] }) {
  const t = useT();
  const write = useSocialWrite();
  const { busy, error, run, clearError } = useAction();
  if (invites.length === 0) return null;
  const join = (room: string) =>
    run(() => http.post<RoomView>(roomApi.join(room))).then(
      (view) => view && navigate({ name: 'room', code: room }),
    );
  return (
    <section className="panel" aria-labelledby="friends-invites">
      <h2 id="friends-invites">{t('friends.invites.title')}</h2>
      <ul className="list">
        {invites.map((invite) => (
          <li key={invite.id} className="list__row">
            <span>{t('friends.invites.from', { name: invite.from.name, code: invite.room })}</span>
            <span className="row">
              <Button onClick={() => void join(invite.room)} disabled={busy}>
                {t('friends.invites.join')}
              </Button>
              <Button
                variant="ghost"
                onClick={() => void run(() => write(socialApi.dismissInvite, { id: invite.id }))}
                aria-label={t('friends.invites.dismiss', { name: invite.from.name })}
              >
                ×
              </Button>
            </span>
          </li>
        ))}
      </ul>
      <Notice message={error} onDismiss={clearError} />
    </section>
  );
}
