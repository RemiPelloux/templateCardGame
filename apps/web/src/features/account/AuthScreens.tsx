import { useState, type FormEvent } from 'react';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from '@cardgame/protocol';
import { Link } from '../../app/Link';
import { navigate } from '../../app/router';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Field } from '../../ui/Field';
import { Notice } from '../../ui/Notice';
import { Page } from '../../ui/Page';
import { useAction } from '../../ui/useAction';
import { RecoveryCodes } from './RecoveryCodes';
import { useAuth } from './useSession';

/** Where to go once signed in: back to the table link that sent the member here, or home. */
function afterSignIn() {
  const next = new URLSearchParams(location.search).get('next');
  if (next?.startsWith('/') && !next.startsWith('//')) {
    history.replaceState(null, '', next);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } else navigate({ name: 'home' }, true);
}

function Credentials({ hints }: { hints?: boolean }) {
  const t = useT();
  return (
    <>
      <Field
        label={t('account.username')}
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        maxLength={USERNAME_MAX_LENGTH}
        required
        hint={
          hints
            ? t('account.usernameHint', { min: USERNAME_MIN_LENGTH, max: USERNAME_MAX_LENGTH })
            : undefined
        }
      />
      <Field
        label={t('account.password')}
        name="password"
        type="password"
        autoComplete={hints ? 'new-password' : 'current-password'}
        minLength={hints ? PASSWORD_MIN_LENGTH : undefined}
        maxLength={PASSWORD_MAX_LENGTH}
        required
        hint={hints ? t('account.passwordHint', { min: PASSWORD_MIN_LENGTH }) : undefined}
      />
    </>
  );
}

const values = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  return Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
};

export function LoginScreen() {
  const t = useT();
  const auth = useAuth();
  const { busy, error, run, clearError } = useAction();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const { username = '', password = '' } = values(event);
    void run(() => auth.login(username, password)).then((ok) => ok && afterSignIn());
  };
  return (
    <Page title={t('account.login.title')} narrow>
      <form className="panel" onSubmit={submit}>
        <Credentials />
        <Notice message={error} onDismiss={clearError} />
        <Button type="submit" disabled={busy}>
          {t('account.login.submit')}
        </Button>
        <p className="muted">
          {t('account.login.noAccount')}{' '}
          <Link to={{ name: 'register' }}>{t('account.register.title')}</Link>
          {' · '}
          <Link to={{ name: 'recover' }}>{t('account.login.forgot')}</Link>
        </p>
      </form>
    </Page>
  );
}

export function RegisterScreen() {
  const t = useT();
  const auth = useAuth();
  const { busy, error, run, clearError } = useAction();
  const [codes, setCodes] = useState<string[] | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const { username = '', password = '' } = values(event);
    void run(() => auth.register(username, password)).then(
      (created) => created && setCodes(created),
    );
  };
  if (codes) return <RecoveryCodes codes={codes} onDone={afterSignIn} />;
  return (
    <Page title={t('account.register.title')} narrow>
      <form className="panel" onSubmit={submit}>
        <Credentials hints />
        <Notice message={error} onDismiss={clearError} />
        <Button type="submit" disabled={busy}>
          {t('account.register.submit')}
        </Button>
        <p className="muted">
          {t('account.register.hasAccount')}{' '}
          <Link to={{ name: 'login' }}>{t('account.login.title')}</Link>
        </p>
      </form>
    </Page>
  );
}

export function RecoverScreen() {
  const t = useT();
  const auth = useAuth();
  const { busy, error, run, clearError } = useAction();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const { username = '', code = '', password = '' } = values(event);
    void run(() => auth.recover(username, code, password)).then((ok) => ok && afterSignIn());
  };
  return (
    <Page title={t('account.recover.title')} lede={t('account.recover.intro')} narrow>
      <form className="panel" onSubmit={submit}>
        <Field
          label={t('account.username')}
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          required
        />
        <Field
          label={t('account.recover.code')}
          name="code"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          required
        />
        <Field
          label={t('account.newPassword')}
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
        />
        <Notice message={error} onDismiss={clearError} />
        <Button type="submit" disabled={busy}>
          {t('account.recover.submit')}
        </Button>
      </form>
    </Page>
  );
}
