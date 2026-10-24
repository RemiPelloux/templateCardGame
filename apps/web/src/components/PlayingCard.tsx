import type { PlayingCard as Card, Suit } from '@cardgame/engine';

export const SUIT_GLYPH: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
};
export const SUIT_NAME: Record<Suit, string> = {
  clubs: 'Clubs',
  diamonds: 'Diamonds',
  hearts: 'Hearts',
  spades: 'Spades',
};
export const isRed = (suit: Suit) => suit === 'hearts' || suit === 'diamonds';

const RANK_NAME: Record<string, string> = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };
export const cardLabel = (card: Card) =>
  `${RANK_NAME[card.rank] ?? card.rank} of ${SUIT_NAME[card.suit]}`;

type Props = {
  card: Card;
  /** Playable cards lift and glow; others dim while it is your move. */
  state?: 'playable' | 'idle' | 'dimmed';
  onSelect?: (card: Card) => void;
};

/** A face-up card of the standard deck. Custom decks swap this component for their own. */
export function PlayingCard({ card, state = 'idle', onSelect }: Props) {
  const face = (
    <>
      <span className="card__corner">
        {card.rank}
        <br />
        {SUIT_GLYPH[card.suit]}
      </span>
      <span className="card__pip" aria-hidden>
        {SUIT_GLYPH[card.suit]}
      </span>
      <span className="card__corner card__corner--end" aria-hidden>
        {card.rank}
        <br />
        {SUIT_GLYPH[card.suit]}
      </span>
    </>
  );
  const className = `card card--${state} ${isRed(card.suit) ? 'card--red' : ''}`;
  if (!onSelect)
    return (
      <div className={className} role="img" aria-label={cardLabel(card)}>
        {face}
      </div>
    );
  return (
    <button
      type="button"
      className={className}
      aria-label={cardLabel(card)}
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
