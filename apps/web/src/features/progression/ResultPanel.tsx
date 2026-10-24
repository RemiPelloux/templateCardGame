import { useEffect } from 'react';
import type { ResultSummary } from '@cardgame/protocol';
import { useI18n } from '../../i18n/I18nProvider';
import type { RoomSlotProps } from '../rooms/slots';
import { useResult, useRewardsChanged } from './queries';
import { achievementName, missionText } from './text';

function Gains({ summary }: { summary: ResultSummary }) {
  const { t } = useI18n();
  return (
    <ul className="gains">
      <li className="gains__chip">{t('progression.xpGain', { count: summary.xp })}</li>
      {summary.coins > 0 && (
        <li className="gains__chip">
          {t('progression.result.coins', { coins: t('common.coins', { count: summary.coins }) })}
        </li>
      )}
    </ul>
  );
}

function Advances({ summary }: { summary: ResultSummary }) {
  const { t } = useI18n();
  return (
    <>
      {summary.missions.length > 0 && (
        <ul className="list" aria-label={t('progression.result.missions')}>
          {summary.missions.map((m) => (
            <li key={m.id} className="list__row">
              <span>{missionText(t, m.id, m.goal)}</span>
              <span>
                {m.completed
                  ? t('progression.missions.done')
                  : t('progression.missions.progress', { progress: m.progress, goal: m.goal })}
              </span>
            </li>
          ))}
        </ul>
      )}
      {summary.achievements.length > 0 && (
        <p>
          <strong>{t('progression.result.achievements')}</strong>{' '}
          {summary.achievements.map((id) => achievementName(t, id)).join(', ')}
        </p>
      )}
    </>
  );
}

function Summary({ summary }: { summary: ResultSummary }) {
  const { t } = useI18n();
  return (
    <>
      <Gains summary={summary} />
      {summary.level.after > summary.level.before && (
        <p>{t('progression.result.levelUp', { level: summary.level.after })}</p>
      )}
      {summary.season.after > summary.season.before && (
        <p>{t('progression.result.seasonUp', { level: summary.season.after })}</p>
      )}
      {summary.items.length > 0 && (
        <p>{t('progression.result.items', { count: summary.items.length })}</p>
      )}
      <Advances summary={summary} />
    </>
  );
}

/** Under a finished table: what this match earned the member. */
export function ResultPanel({ room }: RoomSlotProps) {
  const { t } = useI18n();
  const seated = room.you !== null && room.status === 'finished';
  const result = useResult({ room: room.code, revision: room.revision }, seated);
  const changed = useRewardsChanged();
  const ended = result.data?.ended;
  useEffect(() => {
    if (ended !== undefined) changed();
  }, [ended, changed]);
  if (!seated || result.isError) return null;
  return (
    <section className="result-gains" aria-live="polite">
      <h3>{t('progression.result.title')}</h3>
      {result.data ? (
        <Summary summary={result.data} />
      ) : (
        <p className="muted">{t('progression.result.loading')}</p>
      )}
    </section>
  );
}
