import { useT } from '../../i18n/I18nProvider';
import { Page } from '../../ui/Page';

/** The shop screen: a placeholder until the feature lands. */
export function ShopScreen() {
  const t = useT();
  return <Page title={t('shop.title')} lede={t('common.status.comingSoon')} />;
}
