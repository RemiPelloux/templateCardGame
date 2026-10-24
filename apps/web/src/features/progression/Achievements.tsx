import type { AchievementView } from '@cardgame/protocol';
import { useI18n } from '../../i18n/I18nProvider';
import { ProgressBar } from './LevelBar';
import { achievementName, achievementText } from './text';

function Trophy({ achievement }: { achievement: AchievementView }) {
  const { t, format } = useI18n();
  const unlocked = achievement.unlocked !== null;
  return (
    <li className={`trophy ${unlocked ? 'trophy--unlocked' : ''}`}>
      <strong>{achievementName(t, achievement.id)}</strong>
      <span className="muted">{achievementText(t, achievement.id)}</span>
      {unlocked ? (
        <span className="trophy__state">
          {t('progression.achievements.unlocked', { date: format.date(achievement.unlocked!) })}
        </span>
      ) : (
        <ProgressBar
          label={t('progression.missions.progress', {
            progress: achievement.progress,
            goal: achievement.goal,
          })}
          into={achievement.progress}
          needed={achievement.goal}
        />
      )}
    </li>
  );
}

/** Every achievement, unlocked first-class and locked ones with their progress. */
export function AchievementsGrid({ achievements }: { achievements: AchievementView[] }) {
  const { t } = useI18n();
  const unlocked = achievements.filter((a) => a.unlocked !== null).length;
  return (
    <section className="panel">
      <h2>
        {t('progression.achievements.title')}{' '}
        <span className="muted">
          {t('progression.achievements.count', { unlocked, total: achievements.length })}
        </span>
      </h2>
      <ul className="trophies">
        {achievements.map((achievement) => (
          <Trophy key={achievement.id} achievement={achievement} />
        ))}
      </ul>
    </section>
  );
}
