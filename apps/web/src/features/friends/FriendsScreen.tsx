import { useState, type FormEvent } from 'react';
import { handleOf, socialApi, type SocialSettings } from '@cardgame/protocol';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Notice } from '../../ui/Notice';
import { Page } from '../../ui/Page';
import { useAction } from '../../ui/useAction';
import { useSession } from '../account/useSession';
import { FriendLists } from './FriendLists';
import { InvitesSection } from './InvitesSection';
import { useSocialOverview, useSocialWrite } from './useSocial';
import './friends.css';

function AddFriend({ mine }: { mine: string }) {
  const { t } = useI18n();
  const write = useSocialWrite();
  const { busy, error, run, clearError } = useAction();
  const [sent, setSent] = useState<string | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const handle = String(new FormData(form).get('handle') ?? '').trim();
    setSent(null);
    void run(() => write(socialApi.request, { handle })).then((ok) => {
      if (!ok) return;
      setSent(handle);
      form.reset();
    });
  };
  return (
    <form className="panel" onSubmit={submit}>
      <h2>{t('friends.add.title')}</h2>
      <Field
        label={t('friends.add.label')}
        hint={t('friends.add.hint', { handle: mine })}
        name="handle"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        required
      />
      <Notice message={error} onDismiss={clearError} />
      <Notice tone="info" message={sent ? t('friends.add.sent', { handle: sent }) : null} />
      <Button type="submit" disabled={busy}>
        {t('friends.add.submit')}
      </Button>
    </form>
  );
}

function AppearOffline({ settings }: { settings: SocialSettings }) {
  const { t } = useI18n();
  const write = useSocialWrite();
  const { busy, error, run, clearError } = useAction();
  const toggle = (appearOffline: boolean) =>
    void run(() => write(socialApi.settings, { appearOffline }));
  return (
    <div className="stack">
      <label className="toggle">
        <input
          type="checkbox"
          checked={settings.appearOffline}
          disabled={busy}
          onChange={(event) => toggle(event.target.checked)}
        />
        {t('friends.appearOffline')}
      </label>
      <Notice message={error} onDismiss={clearError} />
    </div>
  );
}

/** Add friends by handle, answer requests, see who is around, join or send table invites. */
export function FriendsScreen() {
  const { t, errorText } = useI18n();
  const session = useSession();
  const { data, error } = useSocialOverview();
  const mine = session.status === 'signed-in' ? handleOf(session.player) : '';
  return (
    <Page title={t('friends.title')} lede={t('friends.lede')} narrow>
      <div className="stack">
        {error && !data && <Notice message={errorText(error)} />}
        {data && <InvitesSection invites={data.invites} />}
        <AddFriend mine={mine} />
        {data ? (
          <>
            <FriendLists overview={data} />
            <AppearOffline settings={data.settings} />
          </>
        ) : (
          !error && <p className="muted">{t('common.status.loading')}</p>
        )}
      </div>
    </Page>
  );
}
