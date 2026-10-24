import { useState } from 'react';
import type { RoomView } from '@cardgame/protocol';
import { Button } from '../components/Button';
import type { RoomHandle } from '../net/useRoom';

const COPIED_MS = 1500;

function ShareCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard?.writeText(location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), COPIED_MS);
    });
  return (
    <div className="share">
      <span className="muted">Table code</span>
      <strong className="share__code">{code}</strong>
      <Button variant="ghost" onClick={copy}>
        {copied ? 'Link copied' : 'Copy link'}
      </Button>
    </div>
  );
}

/** Before the deal: who sits where, bots for empty seats, and the host's start button. */
export function Lobby({ room, handle }: { room: RoomView; handle: RoomHandle }) {
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
              aria-label={seat.connected ? 'Connected' : 'Away'}
            />
            <span className="lobby__name">
              {seat.name}
              {i === you && ' (you)'}
              {seat.host && <span className="tag">host</span>}
              {seat.bot && <span className="tag">bot · {seat.bot}</span>}
            </span>
            {isHost && seat.bot && (
              <Button
                variant="ghost"
                onClick={() => handle.seats({ action: 'removeBot', seat: i })}
                aria-label={`Remove ${seat.name}`}
              >
                Remove
              </Button>
            )}
          </li>
        ))}
      </ol>
      {you === null && (
        <Button onClick={handle.join} disabled={full || handle.busy}>
          Take a seat
        </Button>
      )}
      {isHost && (
        <div className="row">
          <Button
            variant="secondary"
            onClick={() => handle.seats({ action: 'addBot' })}
            disabled={full || handle.busy}
          >
            Add a bot
          </Button>
          <Button onClick={() => handle.start()} disabled={!ready || handle.busy}>
            Deal
          </Button>
        </div>
      )}
      {!isHost && you !== null && <p className="muted">Waiting for the host to deal…</p>}
      {!ready && <p className="muted">At least {limits.minSeats} players are needed.</p>}
    </section>
  );
}
