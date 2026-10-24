import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { LOCALE_IDS, LOCALES, type Locale } from '@cardgame/i18n';
import { accountApi, PASSWORD_MIN_LENGTH, type AccountOverview } from '@cardgame/protocol';
import { keys } from '../../app/query';
import { navigate } from '../../app/router';
import { useI18n } from '../../i18n/I18nProvider';
import { http } from '../../net/http';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Notice } from '../../ui/Notice';
import { Page } from '../../ui/Page';
import { useAction } from '../../ui/useAction';
import { RecoveryCodes } from './RecoveryCodes';
import { useAuth } from './useSession';

const formValue = (event: FormEvent<HTMLFormElement>, name: string) => {
  event.preventDefault();
  return String(new FormData(event.currentTarget).get(name) ?? '');
};

function LanguageSection() {
  const { t, locale } = useI18n();
  const { changeLocale } = useAuth();
  return (
    <section className="panel">
      <h2>{t('account.settings.language')}</h2>
      <select
        className="input"
        value={locale}
        onChange={(e) => changeLocale(e.target.value as Locale)}
        aria-label={t('account.settings.language')}
      >
        {LOCALE_IDS.map((id) => (
          <option key={id} value={id}>
            {LOCALES[id].label}
          </option>
        ))}
      </select>
    </section>
  );
}

function PasswordSection() {
  const { t } = useI18n();
  const { busy, error, run, clearError } = useAction();
  const [done, setDone] = useState(false);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const current = formValue(event, 'current');
    const next = String(new FormData(form).get('next') ?? '');
    void run(() => http.post(accountApi.password, { current, next })).then(() => {
      setDone(true);
      form.reset();
    });
  };
  return (
    <form className="panel" onSubmit={submit}>
      <h2>{t('account.settings.password.title')}</h2>
      <Field
        label={t('account.currentPassword')}
        name="current"
        type="password"
        autoComplete="current-password"
        required
      />
      <Field
        label={t('account.newPassword')}
        name="next"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        required
      />
      <Notice message={error} onDismiss={clearError} />
      <Notice tone="info" message={done && !error ? t('account.settings.password.done') : null} />
      <Button type="submit" disabled={busy}>
        {t('account.settings.password.submit')}
      </Button>
    </form>
  );
}

function RecoverySection({
  overview,
  onCodes,
}: {
  overview: AccountOverview;
  onCodes: (codes: string[]) => void;
}) {
  const { t } = useI18n();
  const { busy, error, run, clearError } = useAction();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const password = formValue(event, 'password');
    void run(() => http.post<{ codes: string[] }>(accountApi.recoveryCodes, { password })).then(
      (r) => r && onCodes(r.codes),
    );
  };
  return (
    <form className="panel" onSubmit={submit}>
      <h2>{t('account.settings.recovery.title')}</h2>
      <p className="muted">{t('account.settings.recovery.remaining', overview.recovery)}</p>
      <Field
        label={t('account.password')}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Notice message={error} onDismiss={clearError} />
      <Button type="submit" variant="secondary" disabled={busy}>
        {t('account.settings.recovery.regenerate')}
      </Button>
    </form>
  );
}

function SessionsSection({ overview }: { overview: AccountOverview }) {
  const { t, format } = useI18n();
  const client = useQueryClient();
  const revoke = (id: string) =>
    http
      .delete(accountApi.session_(id))
      .then(() => client.invalidateQueries({ queryKey: keys.account }));
  return (
    <section className="panel">
      <h2>{t('account.settings.sessions.title')}</h2>
      <ul className="list">
        {overview.sessions.map((s) => (
          <li key={s.id} className="list__row">
            <span>
              <strong>{s.device}</strong>
              <br />
              <span className="muted">
                {s.current
                  ? t('account.settings.sessions.current')
                  : t('account.settings.sessions.lastSeen', { date: format.dateTime(s.seen) })}
              </span>
            </span>
            {!s.current && (
              <Button variant="ghost" onClick={() => void revoke(s.id)}>
                {t('account.settings.sessions.revoke')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DangerSection() {
  const { t } = useI18n();
  const auth = useAuth();
  const { busy, error, run, clearError } = useAction();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const password = formValue(event, 'password');
    void run(() => http.post(accountApi.deleteAccount, { password })).then(async () => {
      await auth.logout().catch(() => {});
      navigate({ name: 'home' });
    });
  };
  return (
    <form className="panel panel--danger" onSubmit={submit}>
      <h2>{t('account.settings.danger.title')}</h2>
      <p className="muted">{t('account.settings.danger.intro')}</p>
      <Field
        label={t('account.password')}
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <Notice message={error} onDismiss={clearError} />
      <Button type="submit" variant="danger" disabled={busy}>
        {t('account.settings.danger.submit')}
      </Button>
    </form>
  );
}

export function AccountScreen() {
  const { t, format } = useI18n();
  const auth = useAuth();
  const [codes, setCodes] = useState<string[] | null>(null);
  const { data } = useQuery({
    queryKey: keys.account,
    queryFn: () => http.get<AccountOverview>(accountApi.account),
  });
  if (codes) return <RecoveryCodes codes={codes} onDone={() => setCodes(null)} />;
  if (!data) return <Page title={t('account.settings.title')} lede={t('common.status.loading')} />;
  const signOut = () => void auth.logout().then(() => navigate({ name: 'home' }));
  return (
    <Page
      title={`${data.player.name}#${data.player.tag}`}
      lede={t('account.settings.memberSince', { date: format.date(data.created) })}
    >
      <div className="stack">
        <LanguageSection />
        <PasswordSection />
        <RecoverySection overview={data} onCodes={setCodes} />
        <SessionsSection overview={data} />
        <section className="panel">
          <h2>{t('account.settings.data.title')}</h2>
          <a className="button button--secondary" href={accountApi.export} download="account.json">
            {t('account.settings.data.export')}
          </a>
          <Button variant="ghost" onClick={signOut}>
            {t('account.settings.signOut')}
          </Button>
        </section>
        <DangerSection />
      </div>
    </Page>
  );
}
