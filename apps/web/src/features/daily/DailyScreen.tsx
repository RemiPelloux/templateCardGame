import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { dailyApi, type DailyStartResponse, type DailyView } from '@cardgame/protocol';
import { Link } from '../../app/Link';
import { navigate } from '../../app/router';
import { useI18n, useT } from '../../i18n/I18nProvider';
import { http } from '../../net/http';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { Page } from '../../ui/Page';
import { useAction } from '../../ui/useAction';
import { PodiumPanel, RankingPanel } from './DailyBoards';
import { dailyKey, lineParams, useCountdown, useDaily } from './useDaily';

/** Day keys are calendar dates: shown from their UTC noon so no time zone moves them a day. */
const NOON_MS = 12 * 60 * 60 * 1000;

function Result({ view }: { view: DailyView }) {
  const t = useT();
  if (view.status.state !== 'finished') return null;
  const { result } = view.status;
  return (
    <div className="stack">
      <strong>{result.won ? t('daily.result.won') : t('daily.result.lost')}</strong>
      <span>
        {t('daily.result.line', lineParams(result, view.ranking.players))}{' '}
        <span className="tag">{t('daily.result.reward', { count: result.reward })}</span>
      </span>
    </div>
  );
}

function TodayAction({ view }: { view: DailyView }) {
  const { t } = useI18n();
  const client = useQueryClient();
  const { busy, error, run, clearError } = useAction();
  const start = () =>
    void run(() => http.post<DailyStartResponse>(dailyApi.start)).then((started) => {
      void client.invalidateQueries({ queryKey: dailyKey });
      if (started) navigate({ name: 'room', code: started.room });
    });
  const { status } = view;
  if (status.state === 'playing')
    return (
      <>
        <p>{t('daily.today.playing')}</p>
        <Link className="button button--primary" to={{ name: 'room', code: status.room }}>
          {t('daily.today.resume')}
        </Link>
      </>
    );
  if (status.state === 'abandoned') return <p className="muted">{t('daily.today.abandoned')}</p>;
  if (status.state !== 'new') return null;
  return (
    <>
      <Button onClick={start} disabled={busy}>
        {t('daily.today.start')}
      </Button>
      <p className="muted">{t('daily.today.once')}</p>
      <Notice message={error} onDismiss={clearError} />
    </>
  );
}

function TodayPanel({ view, onNewDay }: { view: DailyView; onNewDay: () => void }) {
  const { t, format } = useI18n();
  const left = useCountdown(view.nextAt, onNewDay);
  return (
    <section className="panel">
      <h2>{t('daily.today.title')}</h2>
      <p className="muted">{format.date(Date.parse(view.day) + NOON_MS)}</p>
      <TodayAction view={view} />
      <Result view={view} />
      <p className="muted countdown">{t('daily.today.next', { time: left })}</p>
    </section>
  );
}

function StreakPanel({ streak }: { streak: DailyView['streak'] }) {
  const t = useT();
  return (
    <section className="panel">
      <h2>{t('daily.streak.title')}</h2>
      <p className="stat">
        <span className="stat__value">{t('daily.streak.days', { count: streak.current })}</span>
        <span className="muted">{t('daily.streak.best', { count: streak.best })}</span>
      </p>
      <p className="muted compete__fine">{t('daily.streak.rule')}</p>
    </section>
  );
}

/** Today's shared deal: play or resume it, my result and streak, the rankings. */
export function DailyScreen() {
  const { t, errorText } = useI18n();
  const client = useQueryClient();
  const daily = useDaily();
  const refresh = useCallback(
    () => void client.invalidateQueries({ queryKey: dailyKey }),
    [client],
  );
  const view = daily.data;
  return (
    <Page title={t('daily.title')} lede={t('daily.lede')}>
      <Notice message={daily.error ? errorText(daily.error) : null} />
      {!view && !daily.error && <p className="muted">{t('common.status.loading')}</p>}
      {view && (
        <div className="compete__grid">
          <TodayPanel view={view} onNewDay={refresh} />
          <StreakPanel streak={view.streak} />
          <RankingPanel ranking={view.ranking} />
          <PodiumPanel podium={view.podium} />
        </div>
      )}
      <p className="compete__more">
        <Link to={{ name: 'ranked' }}>{t('daily.ranked')}</Link>
      </p>
    </Page>
  );
}
