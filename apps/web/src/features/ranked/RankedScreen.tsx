import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { PROVISIONAL_GAMES } from '@cardgame/meta';
import { rankedApi, type RankedQueueStatus, type RankedView } from '@cardgame/protocol';
import { Link } from '../../app/Link';
import { navigate } from '../../app/router';
import { useI18n, useT } from '../../i18n/I18nProvider';
import { http } from '../../net/http';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { Page } from '../../ui/Page';
import { useAction } from '../../ui/useAction';
import { LeaderboardPanel, RecentPanel } from './RankedBoards';
import { rankedKey, useRanked } from './useRanked';

/** Goes to the table as soon as a search this page started turns into a match. */
function useJoinWhenMatched(queue: RankedQueueStatus | undefined) {
  const previous = useRef(queue?.state);
  useEffect(() => {
    if (queue?.state === 'matched' && previous.current === 'searching')
      navigate({ name: 'room', code: queue.room });
    previous.current = queue?.state;
  }, [queue]);
}

function Searching(props: { gap: number; busy: boolean; onCancel: () => void }) {
  const t = useT();
  return (
    <div className="row" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>
        {t('ranked.queue.searching')}
        <br />
        <span className="muted">{t('ranked.queue.range', { gap: props.gap })}</span>
      </span>
      <Button variant="secondary" onClick={props.onCancel} disabled={props.busy}>
        {t('ranked.queue.cancel')}
      </Button>
    </div>
  );
}

function QueueControls({ queue }: { queue: RankedQueueStatus }) {
  const t = useT();
  const client = useQueryClient();
  const { busy, error, run, clearError } = useAction();
  const change = (method: 'post' | 'delete') =>
    void run(() => http[method]<RankedQueueStatus>(rankedApi.queue)).then((next) => {
      if (next)
        client.setQueryData<RankedView>(rankedKey, (view) => view && { ...view, queue: next });
    });
  return (
    <>
      {queue.state === 'idle' && (
        <Button onClick={() => change('post')} disabled={busy}>
          {t('ranked.queue.find')}
        </Button>
      )}
      {queue.state === 'searching' && (
        <Searching gap={queue.gap} busy={busy} onCancel={() => change('delete')} />
      )}
      {queue.state === 'matched' && (
        <Link className="button button--primary" to={{ name: 'room', code: queue.room }}>
          {t('ranked.queue.join')}
        </Link>
      )}
      <p className="muted compete__fine">{t('ranked.queue.warning')}</p>
      <Notice message={error} onDismiss={clearError} />
    </>
  );
}

function RatingPanel({ view }: { view: RankedView }) {
  const t = useT();
  return (
    <section className="panel">
      <h2>{t('ranked.rating.title')}</h2>
      <p className="stat">
        <span className="stat__value">{view.rating}</span>
        {view.provisional && <span className="tag">{t('ranked.rating.provisional')}</span>}
      </p>
      <p className="muted">
        {t('ranked.rating.games', { count: view.games })} ·{' '}
        {t('ranked.rating.wins', { count: view.wins })}
      </p>
      {view.provisional && (
        <p className="muted compete__fine">
          {t('ranked.rating.provisionalHint', { count: PROVISIONAL_GAMES })}
        </p>
      )}
      <QueueControls queue={view.queue} />
    </section>
  );
}

/** Ranked duels: my rating, the matchmaking queue, the leaderboard and my recent games. */
export function RankedScreen() {
  const { t, errorText } = useI18n();
  const ranked = useRanked();
  const view = ranked.data;
  useJoinWhenMatched(view?.queue);
  return (
    <Page title={t('ranked.title')} lede={t('ranked.lede')}>
      <Notice message={ranked.error ? errorText(ranked.error) : null} />
      {!view && !ranked.error && <p className="muted">{t('common.status.loading')}</p>}
      {view && (
        <div className="compete__grid">
          <RatingPanel view={view} />
          <LeaderboardPanel board={view.leaderboard} />
          <RecentPanel games={view.recent} />
        </div>
      )}
      <p className="compete__more">
        <Link to={{ name: 'daily' }}>{t('daily.title')}</Link>
      </p>
    </Page>
  );
}
