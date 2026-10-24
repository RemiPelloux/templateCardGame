import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { routePath, type Route } from '@cardgame/protocol';
import { useSession } from '../features/account/useSession';
import { useT } from '../i18n/I18nProvider';
import { Page } from '../ui/Page';
import { navigate } from './router';
import { ACCOUNT_ONLY, GUEST_ONLY, propsOf, SCREENS } from './screens';

/** One broken screen shows an error instead of blanking the whole app. */
class ScreenBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Loading() {
  const t = useT();
  return <Page title="" lede={t('common.status.loading')} narrow />;
}

/** Sends guests to sign in (then back), and signed-in members away from the sign-in pages. */
function useAccess(route: Route) {
  const session = useSession();
  const guestOnPrivate = session.status === 'guest' && ACCOUNT_ONLY.has(route.name);
  const memberOnGuest = session.status === 'signed-in' && GUEST_ONLY.has(route.name);
  useEffect(() => {
    if (guestOnPrivate) {
      history.replaceState(null, '', `/login?next=${encodeURIComponent(routePath(route))}`);
      navigate({ name: 'login' }, true);
    } else if (memberOnGuest) navigate({ name: 'home' }, true);
  }, [guestOnPrivate, memberOnGuest, route]);
  return session.status !== 'loading' && !guestOnPrivate && !memberOnGuest;
}

export function ScreenOutlet({ route }: { route: Route }) {
  const t = useT();
  const ready = useAccess(route);
  const needsSession = ACCOUNT_ONLY.has(route.name) || GUEST_ONLY.has(route.name);
  if (needsSession && !ready) return <Loading />;
  const Screen = SCREENS[route.name];
  const key = route.name === 'room' ? route.code : route.name;
  return (
    <ScreenBoundary key={key} fallback={<Page title={t('common.errors.UNKNOWN')} narrow />}>
      <Suspense fallback={<Loading />}>
        <Screen {...propsOf(route)} />
      </Suspense>
    </ScreenBoundary>
  );
}
