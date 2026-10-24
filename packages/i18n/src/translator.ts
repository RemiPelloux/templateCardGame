import { isPlural, type Catalog, type Message, type MessageKey } from './catalog';
import { LOCALES, type Locale } from './locales';

export type Params = Record<string, string | number>;
export type Translate<T> = (key: MessageKey<T>, params?: Params) => string;

function lookup(catalog: Catalog, key: string): Message | undefined {
  let node: Catalog | Message | undefined = catalog;
  for (const part of key.split('.')) {
    if (!node || typeof node === 'string' || isPlural(node)) return undefined;
    node = (node as Catalog)[part];
  }
  return typeof node === 'string' || isPlural(node) ? node : undefined;
}

/** Whether `key` names a message in `catalog`: for dynamic keys such as error codes. */
export const hasMessage = (catalog: Catalog, key: string) => lookup(catalog, key) !== undefined;

/**
 * Turns keys into text for one locale. `{name}` placeholders are replaced from `params`; a
 * plural message picks its form from `params.count` with the locale's own plural rules, and
 * numbers are formatted for the locale. A key missing from the catalog falls back to
 * `fallback` (English), then to the key itself, so a gap shows rather than crashes.
 */
export function createTranslator<T extends Catalog>(
  locale: Locale,
  catalog: T,
  fallback?: Catalog,
) {
  const intl = LOCALES[locale].intl;
  const plurals = new Intl.PluralRules(intl);
  const numbers = new Intl.NumberFormat(intl);
  const fill = (text: string, params: Params = {}) =>
    text.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const value = params[name];
      if (value === undefined) return whole;
      return typeof value === 'number' ? numbers.format(value) : value;
    });
  const translate = (key: string, params?: Params) => {
    const message = lookup(catalog, key) ?? (fallback && lookup(fallback, key));
    if (message === undefined) return key;
    if (typeof message === 'string') return fill(message, params);
    const count = Number(params?.count ?? 0);
    const form = count === 0 && message.zero ? 'zero' : plurals.select(count);
    return fill(message[form as keyof typeof message] ?? message.other, params);
  };
  return translate as Translate<T>;
}

/** Locale-aware formatting for numbers, dates and relative times. */
export function formatters(locale: Locale) {
  const intl = LOCALES[locale].intl;
  return {
    number: (value: number) => new Intl.NumberFormat(intl).format(value),
    date: (value: number | Date) =>
      new Intl.DateTimeFormat(intl, { dateStyle: 'medium' }).format(value),
    dateTime: (value: number | Date) =>
      new Intl.DateTimeFormat(intl, { dateStyle: 'medium', timeStyle: 'short' }).format(value),
    relative: (value: number, unit: Intl.RelativeTimeFormatUnit) =>
      new Intl.RelativeTimeFormat(intl, { numeric: 'auto' }).format(value, unit),
  };
}
