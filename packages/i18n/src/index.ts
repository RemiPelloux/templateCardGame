/** @cardgame/i18n — typed, dependency-free translations. Guide: docs/i18n.md. */
export {
  defineBundle,
  isPlural,
  type Bundle,
  type Catalog,
  type Message,
  type MessageKey,
  type Plural,
  type Translation,
} from './catalog';
export {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_IDS,
  LOCALES,
  negotiateLocale,
  type Locale,
} from './locales';
export { mergeBundles, missingKeys, type Messages } from './merge';
export {
  createTranslator,
  formatters,
  hasMessage,
  type Params,
  type Translate,
} from './translator';
