import type { SeasonView } from '@cardgame/protocol';
import { useI18n } from '../../i18n/I18nProvider';
import { ProgressBar } from './LevelBar';

/** The current season and the member's step on its track. */
export function SeasonPanel({ season }: { season: SeasonView }) {
  const { t, format } = useI18n();
  return (
    <section className="panel">
      <h2>{t('progression.season.title', { number: season.number })}</h2>
      <p className="muted">{t('progression.season.ends', { date: format.date(season.ends) })}</p>
      <ProgressBar
        label={t('progression.season.level', { level: season.level })}
        into={season.into}
        needed={season.needed}
      />
    </section>
  );
}
