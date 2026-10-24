import type { ComponentType } from 'react';
import type { LogEntry, MatchView } from '@cardgame/engine';
import type { Command, View } from '@cardgame/game';
import type { Locale, Translate } from '@cardgame/i18n';
import type { AppMessages } from '../../i18n/messages';

type T = Translate<AppMessages>;
export type RulesSections = Record<string, { title: string; body: string }>;

/** How the board draws one of an expansion's own cards (`special` kind in packages/game). */
export type SpecialCardUi = {
  label(t: T): string;
  /** The card's face, drawn inside the standard card frame. */
  Face: ComponentType;
};

/**
 * The web half of an expansion: its name, its cards, its log sentences and its rules, in the
 * reader's language. Registered once in `expansions/index.ts`, next to the game's registry.
 */
export type ExpansionUi = {
  id: string;
  name(t: T): string;
  tagline(t: T): string;
  /** By `special` kind: `{ joker: { label, Face } }`. */
  cards: Record<string, SpecialCardUi>;
  /** A sentence for one of the expansion's own log events; null for any other event. */
  describe?(entry: LogEntry, names: string[], t: T): string | null;
  /** Rules sections for the rules screen, from the expansion's bundle. */
  rules(locale: Locale): RulesSections;
  /** A public line on the board while it is played (the direction of play…). */
  Status?: ComponentType<{ view: MatchView<View, Command> }>;
};
