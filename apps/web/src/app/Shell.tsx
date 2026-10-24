import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { economyApi, type Route, type WalletView } from '@cardgame/protocol';
import { useSession } from '../features/account/useSession';
import { useT } from '../i18n/I18nProvider';
import { http } from '../net/http';
import { Link } from './Link';
import { NAV } from './nav';
import { keys } from './query';
import { IMMERSIVE } from './screens';

function Coins() {
  const t = useT();
  const { data } = useQuery({
    queryKey: keys.wallet,
    queryFn: () => http.get<WalletView>(economyApi.wallet),
  });
  if (!data) return null;
  return (
    <Link
      className="coins"
      to={{ name: 'shop' }}
      aria-label={t('common.coins', { count: data.coins })}
    >
      <span aria-hidden>●</span> {data.coins}
    </Link>
  );
}

function Header({ route }: { route: Route }) {
  const t = useT();
  const session = useSession();
  return (
    <header className="shell__header">
      <Link className="brand" to={{ name: 'home' }}>
        {t('game.name')}
      </Link>
      <nav className="shell__links" aria-label={t('common.nav.main')}>
        {NAV.map((item) => (
          <Link
            key={item.route}
            to={{ name: item.route } as Route}
            aria-current={route.name === item.route ? 'page' : undefined}
          >
            {t(item.label)}
          </Link>
        ))}
      </nav>
      <div className="shell__account">
        {session.status === 'signed-in' ? (
          <>
            <Coins />
            <Link
              className="avatar-link"
              to={{ name: 'account' }}
              aria-label={t('common.nav.account')}
            >
              {session.player.name.slice(0, 1).toUpperCase()}
            </Link>
          </>
        ) : (
          <Link className="button button--secondary" to={{ name: 'login' }}>
            {t('common.nav.signIn')}
          </Link>
        )}
      </div>
    </header>
  );
}

function TabBar({ route }: { route: Route }) {
  const t = useT();
  return (
    <nav className="tabbar" aria-label={t('common.nav.main')}>
      {NAV.map((item) => (
        <Link
          key={item.route}
          className="tabbar__item"
          to={{ name: item.route } as Route}
          aria-current={route.name === item.route ? 'page' : undefined}
        >
          <span className="tabbar__icon" aria-hidden>
            {item.icon}
          </span>
          {t(item.label)}
        </Link>
      ))}
    </nav>
  );
}

/** The frame around every page: header, the page, and the tab bar on phones. */
export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const immersive = IMMERSIVE.has(route.name);
  return (
    <div className={`shell ${immersive ? 'shell--immersive' : ''}`}>
      {!immersive && <Header route={route} />}
      {children}
      {!immersive && <TabBar route={route} />}
    </div>
  );
}
