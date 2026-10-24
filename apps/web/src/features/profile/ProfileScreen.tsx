import { useT } from '../../i18n/I18nProvider';
import { Page } from '../../ui/Page';

/** The profile screen: a placeholder until the feature lands. */
export function ProfileScreen(_: { handle?: string }) {
  const t = useT();
  return <Page title={t('profile.title')} lede={t('common.status.comingSoon')} />;
}
