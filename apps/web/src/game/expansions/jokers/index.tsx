import type { MatchView } from '@cardgame/engine';
import type { Command, View } from '@cardgame/game';
import { useT } from '../../../i18n/I18nProvider';
import { messages } from '../../../i18n/messages';
import type { ExpansionUi } from '../types';

/** Mirrors `CLOCKWISE` in packages/game/src/expansions/jokers. */
const CLOCKWISE = 1;

function JokerFace() {
  return (
    <>
      <span className="card__corner card__corner--joker" aria-hidden>
        ★
      </span>
      <span className="card__pip card__pip--joker" aria-hidden>
        🃏
      </span>
      <span className="card__corner card__corner--end card__corner--joker" aria-hidden>
        ★
      </span>
    </>
  );
}

/** Which way play goes round the table: public, so everyone sees it. */
function Direction({ view }: { view: MatchView<View, Command> }) {
  const t = useT();
  const clockwise = view.state.expansionView?.direction === CLOCKWISE;
  return (
    <p className="board__status">
      <span aria-hidden>{clockwise ? '↻' : '↺'}</span>{' '}
      {t(clockwise ? 'jokers.direction.clockwise' : 'jokers.direction.counterClockwise')}
    </p>
  );
}

export const jokersUi: ExpansionUi = {
  id: 'jokers',
  name: (t) => t('jokers.name'),
  tagline: (t) => t('jokers.tagline'),
  cards: { joker: { label: (t) => t('jokers.cards.joker'), Face: JokerFace } },
  describe(entry, names, t) {
    if (entry.event !== 'reverse') return null;
    return t('jokers.log.reverse', { name: names[entry.seat ?? 0] ?? '' });
  },
  rules: (locale) => messages[locale].jokers.rules,
  Status: Direction,
};
