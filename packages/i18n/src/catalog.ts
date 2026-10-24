import type { Locale } from './locales';

/** A message that changes with a number: `{ one: '{count} card', other: '{count} cards' }`. */
export type Plural = {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};
export type Message = string | Plural;
export type Catalog = { readonly [key: string]: Message | Catalog };

/** The same keys as the reference catalog, with any wording: what every other locale must provide. */
export type Translation<T> = {
  readonly [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends Plural
      ? Plural
      : Translation<T[K]>;
};

/** One namespace in every locale. A missing locale or key is a compile error. */
export type Bundle<T extends Catalog> = { readonly en: T } & {
  readonly [L in Exclude<Locale, 'en'>]: Translation<T>;
};

/** Declares a namespace's messages: English is the reference, every other locale mirrors it. */
export const defineBundle = <T extends Catalog>(bundle: Bundle<T>) => bundle;

type Join<K extends string, P extends string> = P extends '' ? K : `${K}.${P}`;
/** Every dotted path to a message: `'lobby.addBot'`, `'cards.count'`. */
export type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends Message ? K : Join<K, MessageKey<T[K]>>;
}[keyof T & string];

const PLURAL_FORMS = new Set(['zero', 'one', 'two', 'few', 'many', 'other']);

export const isPlural = (value: unknown): value is Plural =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as Plural).other === 'string' &&
  Object.keys(value).every((key) => PLURAL_FORMS.has(key));
