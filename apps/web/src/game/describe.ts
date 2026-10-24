import type { LogEntry, Outcome, PlayingCard, Suit } from '@cardgame/engine';
import { cardLabel, SUIT_NAME } from '../components/PlayingCard';

/** Log entries as sentences. Translating the game means translating this file and the board. */
export function describe(entry: LogEntry, names: string[]): string {
  const who = entry.seat === null ? 'The dealer' : (names[entry.seat] ?? `Seat ${entry.seat + 1}`);
  const card = entry.data?.card as PlayingCard | undefined;
  switch (entry.event) {
    case 'deal':
      return `Each player is dealt ${String(entry.data?.handSize)} cards.`;
    case 'starter':
      return `The starter card is the ${cardLabel(card!)}.`;
    case 'play': {
      const suit = entry.data?.suit as Suit | undefined;
      return `${who} plays the ${cardLabel(card!)}${suit ? ` and names ${SUIT_NAME[suit]}` : ''}.`;
    }
    case 'draw':
      return `${who} draws a card.`;
    case 'drew':
      return `You drew the ${cardLabel(card!)}.`;
    case 'pass':
      return `${who} passes.`;
    case 'reshuffle':
      return 'The discard pile is shuffled back into the deck.';
    default:
      return entry.event;
  }
}

export function outcomeReason(outcome: Outcome): string {
  if (outcome.reason === 'BLOCKED')
    return 'Nothing left to draw and nobody could play: the lightest hand wins.';
  return 'Every card played! The winner scores the points left in the other hands.';
}
