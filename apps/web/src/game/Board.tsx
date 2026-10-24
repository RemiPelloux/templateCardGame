import { useState } from 'react';
import type { PlayingCard as Card } from '@cardgame/engine';
import { isWild } from '@cardgame/game';
import { Button } from '../components/Button';
import { CardBack, isRed, PlayingCard, SUIT_GLYPH, SUIT_NAME } from '../components/PlayingCard';
import type { MatchController } from '../play/controller';
import { SuitPicker } from './SuitPicker';

/** The Crazy Eights play area: deck and discard pile, the suit to follow, your hand. */
export function Board({ controller }: { controller: MatchController }) {
  const { view, send, names } = controller;
  const { state, legal } = view;
  const [eight, setEight] = useState<string | null>(null);
  const playable = new Set(legal.flatMap((c) => (c.type === 'play' ? [c.cardId] : [])));
  const canDraw = legal.some((c) => c.type === 'draw');
  const canPass = legal.some((c) => c.type === 'pass');
  const yourMove = legal.length > 0;

  const select = (card: Card) =>
    isWild(card) ? setEight(card.id) : send({ type: 'play', cardId: card.id });
  const prompt = yourMove
    ? `Your move: follow ${SUIT_GLYPH[state.suit]} ${SUIT_NAME[state.suit]} or a ${state.top.rank}, or play an eight.`
    : view.outcome
      ? 'The match is over.'
      : `Waiting for ${names[state.turn]}…`;

  return (
    <div className="board">
      <div className="board__piles">
        <button
          type="button"
          className="pile pile--deck"
          onClick={() => send({ type: 'draw' })}
          disabled={!canDraw}
          aria-label={`Draw a card (${state.deckCount} left)`}
        >
          {state.deckCount > 0 ? <CardBack /> : <span className="pile__empty">Empty</span>}
          <span className="pile__count">{state.deckCount}</span>
        </button>
        <div className="pile pile--discard">
          <PlayingCard card={state.top} />
        </div>
        <p
          className={`board__suit ${isRed(state.suit) ? 'is-red' : ''}`}
          aria-label={`Suit to follow: ${SUIT_NAME[state.suit]}`}
        >
          {SUIT_GLYPH[state.suit]}
        </p>
      </div>
      <p className="board__prompt" aria-live="polite">
        {prompt}
      </p>
      {eight && (
        <SuitPicker
          onPick={(suit) => {
            send({ type: 'play', cardId: eight, suit });
            setEight(null);
          }}
          onCancel={() => setEight(null)}
        />
      )}
      <div className="hand" aria-label="Your hand">
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
          Pass
        </Button>
      )}
    </div>
  );
}
