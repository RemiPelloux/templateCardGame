import { gameUi } from '../game';
import { useT } from '../i18n/I18nProvider';
import type { MatchController } from './controller';

/** Every seat around the table: who is to play, who is a bot, and the game's public summary. */
export function Seats({ controller }: { controller: MatchController }) {
  const t = useT();
  const { view, names, bots } = controller;
  return (
    <ol className="seats" aria-label={t('table.players')}>
      {names.map((name, seat) => {
        const acting = view.actors.includes(seat);
        const you = seat === view.you;
        return (
          <li
            key={seat}
            className={`seat ${acting ? 'seat--acting' : ''} ${you ? 'seat--you' : ''}`}
            aria-current={acting ? 'step' : undefined}
          >
            <span className="seat__avatar" aria-hidden>
              {bots[seat] ? '🤖' : name.slice(0, 1).toUpperCase()}
            </span>
            <span className="seat__text">
              <span className="seat__name">
                {you && name !== t('table.you') ? t('table.youSuffix', { name }) : name}
              </span>
              <span className="seat__summary">{gameUi.seatSummary(view, seat, t)}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
