import { useEffect, useRef, useState } from 'react';
import type { BoosterReveal as Reveal, OpeningResponse } from '@cardgame/protocol';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { ItemPreview } from './ItemCard';
import { useItemText } from './useItemText';

/** The pause between two cards turning over: long enough to read each one. */
const REVEAL_STEP_MS = 750;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION).matches;

/** How many cards are face up: one more every step, or all at once without motion. */
function useRevealCount(total: number) {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? total : 0));
  useEffect(() => {
    if (shown >= total) return;
    const timer = setTimeout(() => setShown((n) => n + 1), REVEAL_STEP_MS);
    return () => clearTimeout(timer);
  }, [shown, total]);
  return { shown, revealAll: () => setShown(total) };
}

function RevealCard({
  reveal,
  index,
  flipped,
}: {
  reveal: Reveal;
  index: number;
  flipped: boolean;
}) {
  const t = useT();
  const text = useItemText();
  const name = text.name(reveal.item);
  return (
    <li
      className={`reveal-card reveal-card--${reveal.rarity} ${flipped ? 'reveal-card--flipped' : ''}`}
      aria-label={flipped ? undefined : t('shop.reveal.hidden', { index: index + 1 })}
    >
      <div className="reveal-card__inner">
        <div className="reveal-card__back" aria-hidden />
        <div className="reveal-card__face" aria-hidden={!flipped}>
          <ItemPreview id={reveal.item} />
          <span className="rarity">{text.rarity(reveal.rarity)}</span>
          <strong>{name}</strong>
          <span className="reveal-card__badge">
            {reveal.duplicate
              ? `${t('shop.reveal.duplicate')} ${t('shop.reveal.refund', { count: reveal.refund })}`
              : t('shop.reveal.new')}
          </span>
        </div>
      </div>
    </li>
  );
}

/** What a screen reader hears as each card turns over. */
function useAnnouncement(reveal: Reveal | undefined) {
  const t = useT();
  const text = useItemText();
  if (!reveal) return '';
  const params = { rarity: text.rarity(reveal.rarity), name: text.name(reveal.item) };
  return reveal.duplicate
    ? t('shop.reveal.announceDuplicate', {
        ...params,
        refund: t('shop.reveal.refund', { count: reveal.refund }),
      })
    : t('shop.reveal.announce', params);
}

/** A booster opening in a modal dialog: the cards flip one by one, then a summary. */
export function BoosterReveal({ opening, onDone }: { opening: OpeningResponse; onDone(): void }) {
  const t = useT();
  const text = useItemText();
  const dialog = useRef<HTMLDialogElement>(null);
  const { shown, revealAll } = useRevealCount(opening.reveals.length);
  const finished = shown >= opening.reveals.length;
  const announcement = useAnnouncement(opening.reveals[shown - 1]);
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);
  return (
    <dialog ref={dialog} className="reveal" aria-labelledby="reveal-title" onClose={onDone}>
      <h2 id="reveal-title">
        {t('shop.reveal.title', { name: text.boosterName(opening.booster) })}
      </h2>
      <ol className="reveal__cards">
        {opening.reveals.map((reveal, i) => (
          <RevealCard key={i} reveal={reveal} index={i} flipped={i < shown} />
        ))}
      </ol>
      <p className="reveal__status" aria-live="polite">
        {announcement}
      </p>
      {finished && opening.refund > 0 && (
        <p className="reveal__summary">{t('shop.reveal.summary', { count: opening.refund })}</p>
      )}
      <div className="row">
        {finished ? (
          <Button onClick={() => dialog.current?.close()} autoFocus>
            {t('shop.reveal.done')}
          </Button>
        ) : (
          <Button variant="secondary" onClick={revealAll}>
            {t('shop.reveal.revealAll')}
          </Button>
        )}
      </div>
    </dialog>
  );
}
