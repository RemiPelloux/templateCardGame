import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '@cardgame/game';
import {
  isRoomCode,
  normalizeRoomCode,
  roomApi,
  type RoomKind,
  type RoomView,
} from '@cardgame/protocol';
import { Link } from '../../app/Link';
import { navigate } from '../../app/router';
import { useI18n } from '../../i18n/I18nProvider';
import { http } from '../../net/http';
import { Button } from '../../ui/Button';
import { Notice } from '../../ui/Notice';
import { useAction } from '../../ui/useAction';
import { useSession } from '../account/useSession';
import { DailyHomeCard } from '../daily/DailyHomeCard';
import { startPractice } from '../practice/PracticeScreen';
import { MissionsPanel } from '../progression/MissionsPanel';

const DEFAULT_PRACTICE_PLAYERS = 3;

function Practice() {
  const { t } = useI18n();
  const [players, setPlayers] = useState(DEFAULT_PRACTICE_PLAYERS);
  return (
    <section className="panel">
      <h2>{t('home.practice.title')}</h2>
      <p className="muted">{t('home.practice.intro')}</p>
      <div className="row">
        <label className="field field--inline">
          {t('home.practice.players')}
          <select
            className="input"
            value={players}
            onChange={(e) => setPlayers(Number(e.target.value))}
          >
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map(
              (n) => (
                <option key={n}>{n}</option>
              ),
            )}
          </select>
        </label>
        <Button onClick={() => startPractice(players)}>{t('home.practice.start')}</Button>
      </div>
    </section>
  );
}

function Online() {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const { error, run, clearError, busy } = useAction();
  const [invalid, setInvalid] = useState(false);
  const mine = useQuery({
    queryKey: ['rooms', 'mine'],
    queryFn: () => http.get<{ code: string; kind: RoomKind }[]>(roomApi.mine),
  });
  const create = () =>
    void run(() => http.post<RoomView>(roomApi.rooms)).then(
      (room) => room && navigate({ name: 'room', code: room.code }),
    );
  const join = (event: FormEvent) => {
    event.preventDefault();
    const room = normalizeRoomCode(code);
    setInvalid(!isRoomCode(room));
    if (isRoomCode(room)) navigate({ name: 'room', code: room });
  };
  const current = mine.data?.[0];
  return (
    <section className="panel">
      <h2>{t('home.online.title')}</h2>
      <p className="muted">{t('home.online.intro')}</p>
      {current && (
        <Link className="button button--secondary" to={{ name: 'room', code: current.code }}>
          {t('home.online.resume', { code: current.code })}
        </Link>
      )}
      <Button onClick={create} disabled={busy}>
        {t('home.online.create')}
      </Button>
      <form className="row" onSubmit={join}>
        <input
          className="input input--code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CODE"
          aria-label={t('home.online.code')}
          autoCapitalize="characters"
        />
        <Button type="submit" variant="secondary">
          {t('home.online.join')}
        </Button>
      </form>
      <Notice
        message={invalid ? t('home.online.badCode') : error}
        onDismiss={() => (setInvalid(false), clearError())}
      />
    </section>
  );
}

function Guest() {
  const { t } = useI18n();
  return (
    <section className="panel">
      <h2>{t('home.guest.title')}</h2>
      <p className="muted">{t('home.guest.intro')}</p>
      <Link className="button button--primary" to={{ name: 'register' }}>
        {t('home.guest.register')}
      </Link>
      <Link className="button button--ghost" to={{ name: 'login' }}>
        {t('home.guest.login')}
      </Link>
    </section>
  );
}

export function HomeScreen() {
  const { t } = useI18n();
  const session = useSession();
  return (
    <main className="home">
      <header className="home__hero">
        <p className="home__eyebrow">{t('common.app.tagline')}</p>
        <h1 className="home__title">{t('game.name')}</h1>
        <p className="home__lede">{t('game.tagline')}</p>
      </header>
      <div className="home__grid">
        <Practice />
        {session.status === 'signed-in' && <Online />}
        {session.status === 'signed-in' && <MissionsPanel />}
        {session.status === 'signed-in' && <DailyHomeCard />}
        {session.status === 'guest' && <Guest />}
        {session.status === 'offline' && <p className="panel muted">{t('home.offline')}</p>}
      </div>
      <p className="home__who muted">
        <Link to={{ name: 'rules' }}>{t('rules.title')}</Link>
      </p>
    </main>
  );
}
