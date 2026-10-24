import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';

type Props = { title: string; open: boolean; onClose: () => void; children: ReactNode };

/**
 * A modal on the native `<dialog>`: the browser traps focus, closes on Escape, restores focus
 * to the opener and hides the page behind from screen readers.
 */
export function Dialog({ title, open, onClose, children }: Props) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
    if (!open && dialog?.open) dialog.close();
  }, [open]);
  return (
    <dialog ref={ref} className="dialog" aria-labelledby={titleId} onClose={onClose}>
      {open && (
        <div className="dialog__body">
          <h2 id={titleId} className="dialog__title">
            {title}
          </h2>
          {children}
          <Button variant="ghost" onClick={onClose}>
            {t('common.actions.close')}
          </Button>
        </div>
      )}
    </dialog>
  );
}
