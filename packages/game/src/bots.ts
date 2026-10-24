import { greedyBot, randomBot, SUITS, type Bot, type Suit } from '@cardgame/engine';
import { isWild, penalty } from './cards';
import type { Command, View } from './types';

/** Scores: get rid of expensive cards first, keep eights for when nothing else fits. */
const PLAY_BONUS = 10;
const WILD_BEST_SUIT = 2;
const DRAW_SCORE = 0.5;
const PASS_SCORE = 0;

/** The suit the bot holds most of, its eights aside: the one to name with an eight. */
function strongestSuit(view: View): Suit {
  const counts = SUITS.map((suit) => view.hand.filter((c) => c.suit === suit && !isWild(c)).length);
  return SUITS[counts.indexOf(Math.max(...counts))]!;
}

function score(command: Command, view: View): number {
  if (command.type === 'draw') return DRAW_SCORE;
  if (command.type === 'pass') return PASS_SCORE;
  const card = view.hand.find((c) => c.id === command.cardId)!;
  if (isWild(card)) return command.suit === strongestSuit(view) ? WILD_BEST_SUIT : PASS_SCORE;
  return PLAY_BONUS + penalty(card);
}

export const basicBot: Bot<View, Command> = greedyBot('basic', (command, match) =>
  score(command, match.state),
);

/** Every bot the server and the lobby may seat, by id. The first one is the default. */
export const bots: Record<string, Bot<View, Command>> = {
  basic: basicBot,
  random: randomBot<View, Command>(),
};
export const DEFAULT_BOT = 'basic';
