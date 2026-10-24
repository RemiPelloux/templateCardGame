import type { Seat } from '@cardgame/engine';
import { isSpecial, isStandard } from '../../card-kinds';
import type { GameExpansion, Hooks } from '../../hooks';
import type { Card, Command, SpecialCard, State, View } from '../../types';
import {
  CLOCKWISE,
  HEADS_UP,
  JOKER,
  JOKER_COUNT,
  JOKER_DRAW,
  JOKER_PENALTY,
  JOKERS_ID,
  JOKERS_ITEM,
  JOKERS_RULES_VERSION,
  REVERSE_RANK,
  SKIP_RANK,
  TRICK_BONUS,
} from './constants';

/** The expansion's own state: which way play goes round the table. */
type JokersState = { direction: number };
const directionOf = (state: State) => (state.expansionState as JokersState).direction;

const isJoker = (card: Card) => isSpecial(card, JOKER);
const isTrick = (card: Card) =>
  isJoker(card) || (isStandard(card) && (card.rank === SKIP_RANK || card.rank === REVERSE_RANK));

const jokerCards = (): SpecialCard[] =>
  Array.from({ length: JOKER_COUNT }, (_, i) => ({ id: `JK${i + 1}`, special: JOKER }));

const onPlay: NonNullable<Hooks['onPlay']> = ({ state, card, ctx }) => {
  if (isJoker(card)) return { draw: JOKER_DRAW, skip: true };
  if (!isStandard(card)) return;
  if (card.rank === SKIP_RANK) return { skip: true };
  if (card.rank !== REVERSE_RANK) return;
  if (state.hands.length === HEADS_UP) return { skip: true };
  const direction = -directionOf(state);
  state.expansionState = { direction } satisfies JokersState;
  ctx.log('reverse', { direction });
};

function botScore(command: Command, view: View) {
  if (command.type !== 'play') return 0;
  const card = view.hand.find((c) => c.id === command.cardId);
  return card && isTrick(card) ? TRICK_BONUS : 0;
}

const hooks: Hooks = {
  cards: jokerCards,
  setup: () => ({ direction: CLOCKWISE }) satisfies JokersState,
  isWild: (card) => (isJoker(card) ? true : undefined),
  onPlay,
  nextSeat: (state, seat): Seat => {
    const players = state.hands.length;
    return (seat + directionOf(state) + players) % players;
  },
  penalty: (card) => (isJoker(card) ? JOKER_PENALTY : undefined),
  view: (state) => ({ direction: directionOf(state) }),
  botScore,
};

/** Jokers & Tricks: two wild jokers that make the next player draw, jacks skip, queens reverse. */
export const jokers: GameExpansion = {
  manifest: {
    id: JOKERS_ID,
    rulesVersion: JOKERS_RULES_VERSION,
    oldestRulesVersion: JOKERS_RULES_VERSION,
    item: JOKERS_ITEM,
  },
  hooks,
};
