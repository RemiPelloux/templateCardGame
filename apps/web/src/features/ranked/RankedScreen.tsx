import { useT } from '../../i18n/I18nProvider';
import { Page } from '../../ui/Page';

/** The ranked screen: a placeholder until the feature lands. */
export function RankedScreen() {
  const t = useT();
  return <Page title={t('ranked.title')} lede={t('common.status.comingSoon')} />;
}
