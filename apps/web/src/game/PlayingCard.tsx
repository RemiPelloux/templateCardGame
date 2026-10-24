import type { PlayingCard as StandardCard, Suit } from '@cardgame/engine';
import { isStandard, type Card } from '@cardgame/game';
import { useT } from '../i18n/I18nProvider';
import type { Translate } from '@cardgame/i18n';
import type { AppMessages } from '../i18n/messages';
import { specialCardUi } from './expansions';

export const SUIT_GLYPH: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};
export const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

const NAMED_RANKS = ['A', 'J', 'Q', 'K'] as const;
type NamedRank = (typeof NAMED_RANKS)[number];

/** “Queen of Hearts” / « Dame de Cœur »; an expansion names its own cards (“Joker”). */
export function cardLabel(card: Card, t: Translate<AppMessages>) {
  if (!isStandard(card)) return specialCardUi(card)?.label(t) ?? card.id;
  const rank = NAMED_RANKS.includes(card.rank as NamedRank)
    ? t(`game.ranks.${card.rank as NamedRank}`)
    : card.rank;
  return t('game.card', { rank, suit: t(`game.suits.${card.suit}`) });
}

type Props = {
  card: Card;
  /** Playable cards lift and glow; others dim while it is your move. */
  state?: 'playable' | 'idle' | 'dimmed';
  onSelect?: (card: Card) => void;
};

function StandardFace({ card }: { card: StandardCard }) {
  const corner = (
    <>
      {card.rank}
      <br />
      {SUIT_GLYPH[card.suit]}
    </>
  );
  return (
    <>
      <span className="card__corner" aria-hidden>
        {corner}
      </span>
      <span className="card__pip" aria-hidden>
        {SUIT_GLYPH[card.suit]}
      </span>
      <span className="card__corner card__corner--end" aria-hidden>
        {corner}
      </span>
    </>
  );
}

/** The face of any card: the standard deck's, or the one its expansion draws. */
function Face({ card }: { card: Card }) {
  if (isStandard(card)) return <StandardFace card={card} />;
  const Special = specialCardUi(card)?.Face;
  return Special ? <Special /> : null;
}

const toneOf = (card: Card) =>
  !isStandard(card) ? `card--special card--${card.special}` : isRed(card.suit) ? 'card--red' : '';

/** A face-up card. Custom decks swap this component for their own. */
export function PlayingCard({ card, state = 'idle', onSelect }: Props) {
  const t = useT();
  const label = cardLabel(card, t);
  const face = <Face card={card} />;
  const className = `card card--${state} ${toneOf(card)}`;
  if (!onSelect)
    return (
      <div className={className} role="img" aria-label={label}>
        {face}
      </div>
    );
  return (
    <button
      type="button"
      className={className}
      aria-label={label}
      disabled={state === 'dimmed'}
      onClick={() => onSelect(card)}
    >
      {face}
    </button>
  );
}

export function CardBack({ label }: { label?: string }) {
  return (
    <div
      className="card card--back"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={!label}
    />
  );
}
