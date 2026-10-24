import type { MissionView } from '@cardgame/protocol';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { useAction } from '../../ui/useAction';
import { ProgressBar } from './LevelBar';
import { useClaim, useProgression } from './queries';
import { missionText } from './text';

function Mission({ mission }: { mission: MissionView }) {
  const { t } = useI18n();
  const claim = useClaim();
  const { busy, error, run, clearError } = useAction();
  const done = mission.progress >= mission.goal;
  const coins = t('common.coins', { count: mission.reward.coins });
  return (
    <li className="mission">
      <div className="mission__text">
        <span>{missionText(t, mission.id, mission.goal)}</span>
        <span className="muted">
          {t('progression.missions.reward', { xp: mission.reward.xp, coins })}
        </span>
      </div>
      <ProgressBar
        label={t('progression.missions.progress', {
          progress: mission.progress,
          goal: mission.goal,
        })}
        into={mission.progress}
        needed={mission.goal}
      />
      {mission.claimed ? (
        <span className="mission__state">{t('progression.missions.claimed')}</span>
      ) : (
        done && (
          <Button disabled={busy} onClick={() => void run(() => claim.mutateAsync(mission.id))}>
            {t('progression.missions.claim')}
          </Button>
        )
      )}
      <Notice message={error} onDismiss={clearError} />
    </li>
  );
}

/** Today's and this week's missions, with their claim buttons. */
export function MissionsPanel() {
  const { t } = useI18n();
  const query = useProgression();
  if (!query.data) return null;
  const periods = ['daily', 'weekly'] as const;
  return (
    <section className="panel">
      <h2>{t('progression.missions.title')}</h2>
      {periods.map((period) => (
        <div key={period} className="stack">
          <h3 className="mission__period">{t(`progression.missions.${period}`)}</h3>
          <ul className="list">
            {query.data.missions
              .filter((mission) => mission.period === period)
              .map((mission) => (
                <Mission key={mission.id} mission={mission} />
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
