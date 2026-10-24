import type { Presence } from '@cardgame/protocol';
import { useT } from '../../i18n/I18nProvider';

/** A coloured dot with its state in words for screen readers (colour is never the only cue). */
export function PresenceDot({ presence }: { presence: Presence }) {
  const t = useT();
  return (
    <span className={`presence presence--${presence}`}>
      <span className="presence__dot" aria-hidden />
      <span className="presence__label">{t(`friends.presence.${presence}`)}</span>
    </span>
  );
}
