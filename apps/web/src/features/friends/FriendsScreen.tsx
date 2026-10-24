import { useT } from '../../i18n/I18nProvider';
import { Page } from '../../ui/Page';

/** The friends screen: a placeholder until the feature lands. */
export function FriendsScreen() {
  const t = useT();
  return <Page title={t('friends.title')} lede={t('common.status.comingSoon')} />;
}
