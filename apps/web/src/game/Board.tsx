import { useState } from 'react';
import type { PlayingCard as Card } from '@cardgame/engine';
import { isWild } from '@cardgame/game';
import { useT } from '../i18n/I18nProvider';
import type { MatchController } from '../table/controller';
import { Button } from '../ui/Button';
import { CardBack, isRed, PlayingCard, SUIT_GLYPH } from './PlayingCard';
import { SuitPicker } from './SuitPicker';

/** The Crazy Eights play area: deck and discard pile, the suit to follow, your hand. */
export function Board({ controller }: { controller: MatchController }) {
  const t = useT();
  const { view, send, names } = controller;
  const { state, legal } = view;
  const [eight, setEight] = useState<string | null>(null);
  const playable = new Set(legal.flatMap((c) => (c.type === 'play' ? [c.cardId] : [])));
  const canDraw = legal.some((c) => c.type === 'draw');
  const canPass = legal.some((c) => c.type === 'pass');
  const yourMove = legal.length > 0;
  const suit = t(`game.suits.${state.suit}`);

  const select = (card: Card) =>
    isWild(card) ? setEight(card.id) : send({ type: 'play', cardId: card.id });
  const prompt = yourMove
    ? t('game.prompt.yourMove', { glyph: SUIT_GLYPH[state.suit], suit, rank: state.top.rank })
    : view.outcome
      ? t('game.prompt.over')
      : t('game.prompt.waiting', { name: names[state.turn] ?? '' });

  return (
    <div className="board">
      <div className="board__piles">
        <button
          type="button"
          className="pile pile--deck"
          onClick={() => send({ type: 'draw' })}
          disabled={!canDraw}
          aria-label={t('game.deck.draw', { count: state.deckCount })}
        >
          {state.deckCount > 0 ? (
            <CardBack />
          ) : (
            <span className="pile__empty">{t('game.deck.empty')}</span>
          )}
          <span className="pile__count">{state.deckCount}</span>
        </button>
        <div className="pile pile--discard">
          <PlayingCard card={state.top} />
        </div>
        <p
          className={`board__suit ${isRed(state.suit) ? 'is-red' : ''}`}
          aria-label={t('game.suitToFollow', { suit })}
        >
          {SUIT_GLYPH[state.suit]}
        </p>
      </div>
      <p className="board__prompt" aria-live="polite">
        {prompt}
      </p>
      {eight && (
        <SuitPicker
          onPick={(chosen) => {
            send({ type: 'play', cardId: eight, suit: chosen });
            setEight(null);
          }}
          onCancel={() => setEight(null)}
        />
      )}
      <div className="hand" aria-label={t('game.hand.label')}>
        {state.hand.map((card) => (
          <PlayingCard
            key={card.id}
            card={card}
            state={!yourMove ? 'idle' : playable.has(card.id) ? 'playable' : 'dimmed'}
            onSelect={yourMove ? select : undefined}
          />
        ))}
      </div>
      {canPass && (
        <Button variant="secondary" onClick={() => send({ type: 'pass' })}>
          {t('game.pass')}
        </Button>
      )}
    </div>
  );
}
