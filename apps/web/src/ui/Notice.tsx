import { useT } from '../i18n/I18nProvider';

type Props = { message: string | null; onDismiss?: () => void; tone?: 'error' | 'info' };

/** A refused move, a failed request or a short confirmation, announced to screen readers. */
export function Notice({ message, onDismiss, tone = 'error' }: Props) {
  const t = useT();
  if (!message) return null;
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <span>{message}</span>
      {onDismiss && (
        <button
          type="button"
          className="notice__close"
          onClick={onDismiss}
          aria-label={t('common.actions.dismiss')}
        >
          ×
        </button>
      )}
    </div>
  );
}
