import { useSyncExternalStore } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { pwaStatus } from './status';
import './pwa.css';

/** Says when the app is offline and when a new version is ready; mounted once by the app. */
export function PwaStatus() {
  const t = useT();
  const { updateReady, online } = useSyncExternalStore(pwaStatus.subscribe, pwaStatus.get);
  return (
    <div className="pwa-status" role="status" aria-live="polite">
      {!online && <p className="notice notice--info">{t('pwa.offline')}</p>}
      {updateReady && (
        <div className="notice notice--info">
          <span>{t('pwa.update.available')}</span>
          <span className="pwa-status__actions">
            <Button variant="primary" onClick={pwaStatus.reload}>
              {t('pwa.update.reload')}
            </Button>
            <Button variant="ghost" onClick={pwaStatus.dismissUpdate}>
              {t('pwa.update.later')}
            </Button>
          </span>
        </div>
      )}
    </div>
  );
}
