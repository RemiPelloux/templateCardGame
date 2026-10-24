import { useT } from '../../i18n/I18nProvider';
import { Page } from '../../ui/Page';

/** The collection screen: a placeholder until the feature lands. */
export function CollectionScreen() {
  const t = useT();
  return <Page title={t('collection.title')} lede={t('common.status.comingSoon')} />;
}
