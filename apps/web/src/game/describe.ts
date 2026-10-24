import type { LogEntry, Outcome, Suit } from '@cardgame/engine';
import type { Translate } from '@cardgame/i18n';
import type { AppMessages } from '../i18n/messages';
import type { Card } from '@cardgame/game';
import { EXPANSION_UIS } from './expansions';
import { cardLabel } from './PlayingCard';

type T = Translate<AppMessages>;

/** Log entries as sentences in the reader's language. */
export function describe(entry: LogEntry, names: string[], t: T): string {
  const name =
    entry.seat === null ? t('game.log.dealer') : (names[entry.seat] ?? `#${entry.seat + 1}`);
  const card = entry.data?.card as Card | undefined;
  const label = card ? cardLabel(card, t) : '';
  switch (entry.event) {
    case 'deal':
      return t('game.log.deal', { handSize: Number(entry.data?.handSize) });
    case 'starter':
      return t('game.log.starter', { card: label });
    case 'play': {
      const suit = entry.data?.suit as Suit | undefined;
      return suit
        ? t('game.log.playWild', { name, card: label, suit: t(`game.suits.${suit}`) })
        : t('game.log.play', { name, card: label });
    }
    case 'draw':
      return t('game.log.draw', { name });
    case 'drew':
      return t('game.log.drew', { card: label });
    case 'pass':
      return t('game.log.pass', { name });
    case 'reshuffle':
      return t('game.log.reshuffle');
    case 'forcedDraw':
      return t('game.log.forcedDraw', { name, count: Number(entry.data?.count) });
    case 'skip':
      return t('game.log.skip', { name });
    default:
      return describeExpansion(entry, names, t);
  }
}

/** Events the base game does not log come from an expansion, which describes its own. */
function describeExpansion(entry: LogEntry, names: string[], t: T): string {
  for (const ui of EXPANSION_UIS) {
    const sentence = ui.describe?.(entry, names, t);
    if (sentence) return sentence;
  }
  return entry.event;
}

export const outcomeReason = (outcome: Outcome, t: T) =>
  t(outcome.reason === 'BLOCKED' ? 'game.outcome.BLOCKED' : 'game.outcome.EMPTY_HAND');
