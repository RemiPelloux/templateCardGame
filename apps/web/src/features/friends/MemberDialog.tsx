import { useState } from 'react';
import { handleOf, socialApi, type SocialPlayer } from '@cardgame/protocol';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { useAction } from '../../ui/useAction';
import { Dialog } from './Dialog';
import { ReportForm } from './ReportForm';
import { useMyTable, useSocialWrite } from './useSocial';

type Props = { person: SocialPlayer; friend: boolean; onClose: () => void };
type View = 'menu' | 'block' | 'report';

/** The member menu: invite, remove, block (after a confirmation) and report. */
export function MemberDialog({ person, friend, onClose }: Props) {
  const t = useT();
  const [view, setView] = useState<View>('menu');
  const handle = handleOf(person);
  const title = view === 'report' ? t('friends.report.title', { name: person.name }) : handle;
  return (
    <Dialog title={title} open onClose={onClose}>
      {view === 'menu' && <Menu {...{ handle, friend, onClose, setView }} />}
      {view === 'block' && <BlockConfirm {...{ handle, name: person.name, onClose }} />}
      {view === 'report' && <ReportForm handle={handle} room={null} />}
    </Dialog>
  );
}

function Menu(props: {
  handle: string;
  friend: boolean;
  onClose: () => void;
  setView(v: View): void;
}) {
  const t = useT();
  const write = useSocialWrite();
  const table = useMyTable();
  const { busy, error, run, clearError } = useAction();
  const [invited, setInvited] = useState(false);
  const invite = () =>
    run(() => write(socialApi.invite, { handle: props.handle, room: table })).then((ok) =>
      setInvited(ok === true),
    );
  const remove = () =>
    run(() => write(socialApi.remove, { handle: props.handle })).then(
      (ok) => ok && props.onClose(),
    );
  return (
    <div className="stack">
      {props.friend && table && (
        <Button onClick={() => void invite()} disabled={busy || invited}>
          {invited ? t('friends.invite.sent') : t('friends.invite.action')}
        </Button>
      )}
      {props.friend && (
        <Button variant="secondary" onClick={() => void remove()} disabled={busy}>
          {t('friends.member.remove')}
        </Button>
      )}
      <Button variant="secondary" onClick={() => props.setView('block')}>
        {t('friends.member.block')}
      </Button>
      <Button variant="danger" onClick={() => props.setView('report')}>
        {t('friends.member.report')}
      </Button>
      <Notice message={error} onDismiss={clearError} />
    </div>
  );
}

function BlockConfirm({
  handle,
  name,
  onClose,
}: {
  handle: string;
  name: string;
  onClose(): void;
}) {
  const t = useT();
  const write = useSocialWrite();
  const { busy, error, run, clearError } = useAction();
  const block = () => run(() => write(socialApi.block, { handle })).then((ok) => ok && onClose());
  return (
    <div className="stack">
      <p>{t('friends.member.blockConfirm', { name })}</p>
      <Notice message={error} onDismiss={clearError} />
      <Button variant="danger" onClick={() => void block()} disabled={busy}>
        {t('friends.member.block')}
      </Button>
    </div>
  );
}
