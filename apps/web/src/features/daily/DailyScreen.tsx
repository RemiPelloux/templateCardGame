import { useT } from '../../i18n/I18nProvider';
import { Page } from '../../ui/Page';

/** The daily screen: a placeholder until the feature lands. */
export function DailyScreen() {
  const t = useT();
  return <Page title={t('daily.title')} lede={t('common.status.comingSoon')} />;
}
