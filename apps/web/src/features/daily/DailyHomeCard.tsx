import { Link } from '../../app/Link';
import { useT } from '../../i18n/I18nProvider';
import { useDaily } from './useDaily';

/** The home screen's way in: today's challenge, or my result once it is played. */
export function DailyHomeCard() {
  const t = useT();
  const status = useDaily().data?.status;
  return (
    <section className="panel">
      <h2>{t('daily.title')}</h2>
      {status?.state === 'finished' ? (
        <p>
          {status.result.won ? t('daily.result.won') : t('daily.result.lost')} ·{' '}
          {t('daily.ranking.rank')} {status.result.rank}
        </p>
      ) : (
        <p className="muted">{t('daily.home.intro')}</p>
      )}
      <Link className="button button--primary" to={{ name: 'daily' }}>
        {t('daily.home.open')}
      </Link>
      <Link className="button button--ghost" to={{ name: 'ranked' }}>
        {t('daily.ranked')}
      </Link>
    </section>
  );
}
