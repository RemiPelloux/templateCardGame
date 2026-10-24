import type { RankedGame, RankedRow, RankedView } from '@cardgame/protocol';
import { useI18n, useT } from '../../i18n/I18nProvider';

/** `+12` or `−8`: a rating change, signed. */
export const signed = (delta: number) => (delta > 0 ? `+${delta}` : `${delta}`.replace('-', '−'));
const deltaClass = (delta: number) => (delta > 0 ? 'delta--up' : delta < 0 ? 'delta--down' : '');

function BoardRow({ row, mine }: { row: RankedRow; mine: boolean }) {
  const t = useT();
  return (
    <tr aria-current={mine || undefined}>
      <td className="leaderboard__num">{row.rank}</td>
      <td>
        {row.name} {mine && <span className="muted">{t('ranked.leaderboard.you')}</span>}
        {row.provisional && <span className="tag">{t('ranked.rating.provisional')}</span>}
      </td>
      <td className="leaderboard__num">{row.rating}</td>
      <td className="leaderboard__num">{row.games}</td>
    </tr>
  );
}

function BoardTable({ rows, me }: { rows: RankedRow[]; me: RankedRow | null }) {
  const t = useT();
  return (
    <div className="leaderboard__scroll">
      <table className="leaderboard">
        <thead>
          <tr>
            <th className="leaderboard__num">{t('ranked.leaderboard.rank')}</th>
            <th>{t('ranked.leaderboard.player')}</th>
            <th className="leaderboard__num">{t('ranked.leaderboard.rating')}</th>
            <th className="leaderboard__num">{t('ranked.leaderboard.games')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <BoardRow key={row.rank} row={row} mine={row.rank === me?.rank} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The best ratings, plus mine when I am further down. */
export function LeaderboardPanel({ board }: { board: RankedView['leaderboard'] }) {
  const t = useT();
  const { top, me } = board;
  const shown = me && !top.some((r) => r.rank === me.rank) ? [...top, me] : top;
  return (
    <section className="panel">
      <h2>{t('ranked.leaderboard.title')}</h2>
      {shown.length ? (
        <BoardTable rows={shown} me={me} />
      ) : (
        <p className="muted">{t('ranked.leaderboard.empty')}</p>
      )}
    </section>
  );
}

function GameRow({ game }: { game: RankedGame }) {
  const { t, format } = useI18n();
  return (
    <li className="list__row">
      <span>
        <strong>{t(`ranked.recent.${game.result}`)}</strong>{' '}
        {t('ranked.recent.against', { name: game.opponent })}
        <br />
        <span className="muted">{format.dateTime(game.ended)}</span>
      </span>
      <span className={deltaClass(game.delta)}>
        {signed(game.delta)} · {game.rating}
      </span>
    </li>
  );
}

export function RecentPanel({ games }: { games: RankedGame[] }) {
  const t = useT();
  return (
    <section className="panel">
      <h2>{t('ranked.recent.title')}</h2>
      {games.length ? (
        <ul className="list">
          {games.map((game) => (
            <GameRow key={`${game.room}-${game.ended}`} game={game} />
          ))}
        </ul>
      ) : (
        <p className="muted">{t('ranked.recent.empty')}</p>
      )}
    </section>
  );
}
