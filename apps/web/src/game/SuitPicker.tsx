import { SUITS, type Suit } from '@cardgame/engine';
import { isRed, SUIT_GLYPH, SUIT_NAME } from '../components/PlayingCard';

type Props = { onPick: (suit: Suit) => void; onCancel: () => void };

/** After an eight: the player names the suit everyone must follow next. */
export function SuitPicker({ onPick, onCancel }: Props) {
  return (
    <div className="suit-picker" role="group" aria-label="Name a suit">
      <p className="suit-picker__title">Name the next suit</p>
      <div className="suit-picker__options">
        {SUITS.map((suit) => (
          <button
            key={suit}
            type="button"
            className={`suit-picker__suit ${isRed(suit) ? 'is-red' : ''}`}
            onClick={() => onPick(suit)}
          >
            <span aria-hidden>{SUIT_GLYPH[suit]}</span>
            {SUIT_NAME[suit]}
          </button>
        ))}
      </div>
      <button type="button" className="suit-picker__cancel" onClick={onCancel}>
        Keep the eight
      </button>
    </div>
  );
}
