import { SUITS, type Suit } from '@cardgame/engine';
import { useT } from '../i18n/I18nProvider';
import { isRed, SUIT_GLYPH } from './PlayingCard';

type Props = { onPick: (suit: Suit) => void; onCancel: () => void };

/** After an eight: the player names the suit everyone must follow next. */
export function SuitPicker({ onPick, onCancel }: Props) {
  const t = useT();
  return (
    <div className="suit-picker" role="group" aria-label={t('game.picker.label')}>
      <p className="suit-picker__title">{t('game.picker.title')}</p>
      <div className="suit-picker__options">
        {SUITS.map((suit) => (
          <button
            key={suit}
            type="button"
            className={`suit-picker__suit ${isRed(suit) ? 'is-red' : ''}`}
            onClick={() => onPick(suit)}
          >
            <span aria-hidden>{SUIT_GLYPH[suit]}</span>
            {t(`game.suits.${suit}`)}
          </button>
        ))}
      </div>
      <button type="button" className="suit-picker__cancel" onClick={onCancel}>
        {t('game.picker.keep')}
      </button>
    </div>
  );
}
