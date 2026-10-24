import type { Bundle, Catalog } from './catalog';
import { LOCALE_IDS, type Locale } from './locales';

type Bundles = Record<string, Bundle<Catalog>>;
/** The English shape of several namespaces put together: `{ common: …, lobby: … }`. */
export type Messages<B extends Bundles> = { [N in keyof B]: B[N]['en'] };

/**
 * Gathers namespaces (one bundle per feature) into one catalog per locale. Each feature owns
 * its own strings next to its code; the app merges them here.
 */
export function mergeBundles<B extends Bundles>(bundles: B): Record<Locale, Messages<B>> {
  const entries = LOCALE_IDS.map((locale) => [
    locale,
    Object.fromEntries(Object.entries(bundles).map(([name, bundle]) => [name, bundle[locale]])),
  ]);
  return Object.fromEntries(entries) as Record<Locale, Messages<B>>;
}

/** Keys present in English but missing (or of another kind) in a locale: for tests and scripts. */
export function missingKeys(reference: Catalog, other: Catalog, prefix = ''): string[] {
  return Object.entries(reference).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const counterpart = other[key];
    if (typeof value === 'string') return typeof counterpart === 'string' ? [] : [path];
    if (counterpart === undefined || typeof counterpart === 'string') return [path];
    return 'other' in value && typeof value.other === 'string'
      ? []
      : missingKeys(value as Catalog, counterpart as Catalog, path);
  });
}
