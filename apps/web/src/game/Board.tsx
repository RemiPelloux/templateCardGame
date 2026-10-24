import { useState } from 'react';
import { isStandard, type Card } from '@cardgame/game';
import { useT } from '../i18n/I18nProvider';
import type { MatchController } from '../table/controller';
import { Button } from '../ui/Button';
import { expansionUi } from './expansions';
import { CardBack, isRed, PlayingCard, SUIT_GLYPH } from './PlayingCard';
import { SuitPicker } from './SuitPicker';

/** What the viewer should do now, or whom the table waits for. */
function promptText({ view, names }: MatchController, t: ReturnType<typeof useT>) {
  const { state } = view;
  const glyph = SUIT_GLYPH[state.suit];
  const suit = t(`game.suits.${state.suit}`);
  if (view.outcome) return t('game.prompt.over');
  if (!view.legal.length) return t('game.prompt.waiting', { name: names[state.turn] ?? '' });
  // An expansion's card on top has no rank to match: only the suit counts.
  return isStandard(state.top)
    ? t('game.prompt.yourMove', { glyph, suit, rank: state.top.rank })
    : t('game.prompt.yourMoveSuit', { glyph, suit });
}

/** The Crazy Eights play area: deck and discard pile, the suit to follow, your hand. */
export function Board({ controller }: { controller: MatchController }) {
  const t = useT();
  const { view, send } = controller;
  const { state, legal } = view;
  const [eight, setEight] = useState<string | null>(null);
  const playable = new Set(legal.flatMap((c) => (c.type === 'play' ? [c.cardId] : [])));
  // The rules say which cards are wild (eights, an expansion's jokers): those name a suit.
  const wild = new Set(legal.flatMap((c) => (c.type === 'play' && c.suit ? [c.cardId] : [])));
  const Status = expansionUi(state.expansion?.id)?.Status;
  const canDraw = legal.some((c) => c.type === 'draw');
  const canPass = legal.some((c) => c.type === 'pass');
  const yourMove = legal.length > 0;
  const suit = t(`game.suits.${state.suit}`);
  const select = (card: Card) =>
    wild.has(card.id) ? setEight(card.id) : send({ type: 'play', cardId: card.id });

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
      {Status && <Status view={view} />}
      <p className="board__prompt" aria-live="polite">
        {promptText(controller, t)}
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
