import type { DailyRankRow, DailyView } from '@cardgame/protocol';
import { useT } from '../../i18n/I18nProvider';

const MEDALS = ['🥇', '🥈', '🥉'];

function RankRow({ row, mine }: { row: DailyRankRow; mine: boolean }) {
  const t = useT();
  return (
    <tr aria-current={mine || undefined}>
      <td className="leaderboard__num">{row.rank}</td>
      <td>
        {row.name} {mine && <span className="muted">{t('daily.ranking.you')}</span>}
        {row.won && <span className="tag">{t('daily.ranking.won')}</span>}
      </td>
      <td className="leaderboard__num">{row.score}</td>
      <td className="leaderboard__num">{row.moves}</td>
    </tr>
  );
}

function RankTable({ rows, me }: { rows: DailyRankRow[]; me: DailyRankRow | null }) {
  const t = useT();
  const shown = me && !rows.some((r) => r.rank === me.rank) ? [...rows, me] : rows;
  return (
    <div className="leaderboard__scroll">
      <table className="leaderboard">
        <thead>
          <tr>
            <th className="leaderboard__num">{t('daily.ranking.rank')}</th>
            <th>{t('daily.ranking.player')}</th>
            <th className="leaderboard__num">{t('daily.ranking.score')}</th>
            <th className="leaderboard__num">{t('daily.ranking.moves')}</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((row) => (
            <RankRow key={row.rank} row={row} mine={row.rank === me?.rank} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Today's ranking: the top lines, plus mine when I am further down. */
export function RankingPanel({ ranking }: { ranking: DailyView['ranking'] }) {
  const t = useT();
  return (
    <section className="panel">
      <h2>{t('daily.ranking.title')}</h2>
      <p className="muted">{t('daily.ranking.players', { count: ranking.players })}</p>
      {ranking.top.length ? (
        <RankTable rows={ranking.top} me={ranking.me} />
      ) : (
        <p className="muted">{t('daily.ranking.empty')}</p>
      )}
      <p className="muted compete__fine">{t('daily.ranking.rule')}</p>
    </section>
  );
}

export function PodiumPanel({ podium }: { podium: DailyView['podium'] }) {
  const t = useT();
  return (
    <section className="panel">
      <h2>{t('daily.podium.title')}</h2>
      {podium.top.length ? (
        <ol className="podium">
          {podium.top.map((row, i) => (
            <li key={row.rank} className="podium__place">
              <span className="podium__medal" aria-hidden="true">
                {MEDALS[i]}
              </span>
              <strong>{row.name}</strong>
              <span className="muted">{row.score}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">{t('daily.podium.empty')}</p>
      )}
    </section>
  );
}
