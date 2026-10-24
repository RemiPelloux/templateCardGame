import { useCallback, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';

/** Runs an async action with a busy flag and a translated error, for forms and buttons. */
export function useAction() {
  const { errorText } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | undefined> => {
      setBusy(true);
      setError(null);
      try {
        return await action();
      } catch (failure) {
        setError(errorText(failure));
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [errorText],
  );
  return { busy, error, run, clearError: () => setError(null) };
}
