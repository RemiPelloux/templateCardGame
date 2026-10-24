import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isRuleError } from '@cardgame/engine';
import {
  createTranslator,
  DEFAULT_LOCALE,
  formatters,
  hasMessage,
  isLocale,
  negotiateLocale,
  type Locale,
  type Translate,
} from '@cardgame/i18n';
import { RequestError } from '../net/http';
import { messages, type AppMessages } from './messages';

const STORAGE_KEY = 'locale';

type I18n = {
  locale: Locale;
  setLocale(locale: Locale): void;
  t: Translate<AppMessages>;
  format: ReturnType<typeof formatters>;
  /** A refusal (server or local rules) in the reader's language. */
  errorText(error: unknown): string;
};

const I18nContext = createContext<I18n | null>(null);

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // Storage blocked: fall back to the browser's languages.
  }
  return typeof navigator === 'undefined'
    ? DEFAULT_LOCALE
    : negotiateLocale(navigator.languages ?? []);
}

/**
 * Looks the code up in the game's errors, then every feature's `errors` (a feature translates
 * the codes it throws in its own bundle), then the app's; else keeps the server's text.
 */
function errorTextFor(locale: Locale, t: Translate<AppMessages>) {
  const catalog = messages[locale];
  const namespaces = [
    'game',
    ...Object.keys(catalog).filter((n) => n !== 'game' && n !== 'common'),
    'common',
  ];
  return (error: unknown) => {
    const code = error instanceof RequestError || isRuleError(error) ? error.code : 'UNKNOWN';
    const params = (error as { params?: Record<string, string | number> }).params;
    for (const key of namespaces.map((n) => `${n}.errors.${code}`))
      if (hasMessage(catalog, key)) return t(key as Parameters<typeof t>[0], params);
    return error instanceof Error && error.message ? error.message : t('common.errors.UNKNOWN');
  };
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(initialLocale);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not remembered on this device; an account keeps it on the server.
    }
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const value = useMemo(() => {
    const t = createTranslator(locale, messages[locale], messages[DEFAULT_LOCALE]);
    return { locale, setLocale, t, format: formatters(locale), errorText: errorTextFor(locale, t) };
  }, [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n needs an I18nProvider.');
  return context;
}

export const useT = () => useI18n().t;
