/** The French-suited 52-card deck, for the many games built on it. Custom games define their own. */
export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];
export type PlayingCard = { id: string; suit: Suit; rank: Rank };

export const isSuit = (value: unknown): value is Suit => SUITS.includes(value as Suit);

/** 1 for an ace up to 13 for a king. */
export const rankOrder = (rank: Rank) => RANKS.indexOf(rank) + 1;

/** One card per suit and rank, `decks` times over; ids look like `QH` or `QH#2`. */
export function standardDeck(decks = 1): PlayingCard[] {
  return Array.from({ length: decks }, (_, copy) =>
    SUITS.flatMap((suit) =>
      RANKS.map((rank) => {
        const id = `${rank}${suit[0]!.toUpperCase()}${copy ? `#${copy + 1}` : ''}`;
        return { id, suit, rank };
      }),
    ),
  ).flat();
}
