import { useState } from 'react';
import type { RoomView } from '@cardgame/protocol';
import { useT } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import type { RoomHandle } from './useRoom';

const COPIED_MS = 1500;

function ShareCode({ code }: { code: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard?.writeText(location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_MS);
    });
  return (
    <div className="share">
      <span className="muted">{t('rooms.share.label')}</span>
      <strong className="share__code">{code}</strong>
      <Button variant="ghost" onClick={copy}>
        {copied ? t('rooms.share.copied') : t('rooms.share.copy')}
      </Button>
    </div>
  );
}

/** Before the deal: who sits where, bots for empty seats, and the host's start button. */
export function Lobby({ room, handle }: { room: RoomView; handle: RoomHandle }) {
  const t = useT();
  const { seats, isHost, limits, you } = room;
  const full = seats.length >= limits.maxSeats;
  const ready = seats.length >= limits.minSeats;
  return (
    <section className="panel lobby">
      <ShareCode code={room.code} />
      <ol className="lobby__seats">
        {seats.map((seat, i) => (
          <li key={i} className="lobby__seat">
            <span
              className={`dot ${seat.connected ? 'dot--on' : ''}`}
              aria-label={seat.connected ? t('rooms.seat.connected') : t('rooms.seat.away')}
            />
            <span className="lobby__name">
              {seat.name}
              {i === you && t('rooms.seat.you')}
              {seat.host && <span className="tag">{t('rooms.seat.host')}</span>}
              {seat.bot && <span className="tag">{t('rooms.seat.bot', { bot: seat.bot })}</span>}
            </span>
            {isHost && seat.bot && (
              <Button
                variant="ghost"
                onClick={() => handle.seats({ action: 'removeBot', seat: i })}
                aria-label={t('rooms.seat.remove', { name: seat.name })}
              >
                ×
              </Button>
            )}
          </li>
        ))}
      </ol>
      {you === null && (
        <Button onClick={handle.join} disabled={full || handle.busy}>
          {t('rooms.takeSeat')}
        </Button>
      )}
      {isHost && (
        <div className="row">
          <Button
            variant="secondary"
            onClick={() => handle.seats({ action: 'addBot' })}
            disabled={full || handle.busy}
          >
            {t('rooms.addBot')}
          </Button>
          <Button onClick={() => handle.start()} disabled={!ready || handle.busy}>
            {t('rooms.deal')}
          </Button>
        </div>
      )}
      {!isHost && you !== null && <p className="muted">{t('rooms.waitingHost')}</p>}
      {!ready && <p className="muted">{t('rooms.needPlayers', { count: limits.minSeats })}</p>}
    </section>
  );
}
