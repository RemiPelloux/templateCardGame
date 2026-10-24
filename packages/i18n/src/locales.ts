/**
 * Every language the app speaks. Adding one is a line here, then the compiler lists each
 * catalog that still lacks it (see docs/i18n.md). Keep `en` first: it is the reference and the
 * fallback.
 */
export const LOCALES = {
  en: { label: 'English', intl: 'en-GB' },
  fr: { label: 'Français', intl: 'fr-FR' },
} as const;

export type Locale = keyof typeof LOCALES;
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_IDS = Object.keys(LOCALES) as Locale[];

export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && value in LOCALES;

/** The best supported locale for a list of preferences (`navigator.languages`, Accept-Language). */
export function negotiateLocale(preferences: readonly string[]): Locale {
  for (const preference of preferences) {
    const base = preference.trim().toLowerCase().split(/[-_;]/)[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
