import { gameUi } from '../game';
import type { MatchController } from '../play/controller';

/** Every seat around the table: who is to play, who is a bot, and the game's public summary. */
export function Seats({ controller }: { controller: MatchController }) {
  const { view, names, bots } = controller;
  return (
    <ol className="seats" aria-label="Players">
      {names.map((name, seat) => {
        const acting = view.actors.includes(seat);
        return (
          <li
            key={seat}
            className={`seat ${acting ? 'seat--acting' : ''} ${seat === view.you ? 'seat--you' : ''}`}
            aria-current={acting ? 'step' : undefined}
          >
            <span className="seat__avatar" aria-hidden>
              {bots[seat] ? '🤖' : name.slice(0, 1).toUpperCase()}
            </span>
            <span className="seat__text">
              <span className="seat__name">
                {name}
                {seat === view.you && name !== 'You' ? ' (you)' : ''}
              </span>
              <span className="seat__summary">{gameUi.seatSummary(view, seat)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
