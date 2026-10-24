import { useT } from '../../i18n/I18nProvider';
import { useSocialPulse } from './useSocial';
import './friends.css';

/** Pending requests and table invites, on the Friends navigation item. */
export function FriendsBadge() {
  const t = useT();
  const { data } = useSocialPulse();
  const count = (data?.requests ?? 0) + (data?.invites ?? 0);
  if (count === 0) return null;
  return (
    <>
      <span className="nav-badge" aria-hidden>
        {count}
      </span>
      <span className="visually-hidden">{t('friends.badge', { count })}</span>
    </>
  );
}

/** Keeps the presence ping going on every page, including tables where the nav is hidden. */
export function PresencePing() {
  useSocialPulse();
  return null;
}
