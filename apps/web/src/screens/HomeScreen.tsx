import { useState, type FormEvent } from 'react';
import { MAX_PLAYERS, MIN_PLAYERS } from '@cardgame/game';
import { api, isRoomCode, normalizeRoomCode, type RoomView } from '@cardgame/protocol';
import { navigate } from '../app/router';
import type { useSession } from '../app/session';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { http } from '../net/http';
import { NameForm } from './NameForm';
import { startPractice } from './PracticeScreen';

const DEFAULT_PRACTICE_PLAYERS = 3;

function Practice() {
  const [players, setPlayers] = useState(DEFAULT_PRACTICE_PLAYERS);
  return (
    <section className="panel">
      <h2>Practice</h2>
      <p className="muted">Play against bots, right here. Works offline.</p>
      <div className="row">
        <label className="field">
          Players
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
        <Button onClick={() => startPractice(players)}>Play vs bots</Button>
      </div>
    </section>
  );
}

function Online() {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = () =>
    http.post<RoomView>(api.rooms).then(
      (room) => navigate({ name: 'room', code: room.code }),
      (failure: Error) => setError(failure.message),
    );
  const join = (event: FormEvent) => {
    event.preventDefault();
    const room = normalizeRoomCode(code);
    if (isRoomCode(room)) navigate({ name: 'room', code: room });
    else setError('That code does not look right.');
  };
  return (
    <section className="panel">
      <h2>Play online</h2>
      <p className="muted">Open a table, share its code, fill empty seats with bots.</p>
      <Button onClick={create}>Create a table</Button>
      <form className="row" onSubmit={join}>
        <input
          className="input input--code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="CODE"
          aria-label="Table code"
          autoCapitalize="characters"
        />
        <Button type="submit" variant="secondary">
          Join
        </Button>
      </form>
      <Notice message={error} onDismiss={() => setError(null)} />
    </section>
  );
}

export function HomeScreen({ session }: { session: ReturnType<typeof useSession> }) {
  const { state, signIn, signOut } = session;
  return (
    <main className="home">
      <header className="home__hero">
        <p className="home__eyebrow">Card Game Template</p>
        <h1 className="home__title">Crazy Eights</h1>
        <p className="home__lede">
          Match the suit or the rank. Eights are wild. Empty your hand first.
        </p>
      </header>
      <div className="home__grid">
        <Practice />
        {state.status === 'signed-in' && <Online />}
        {state.status === 'guest' && <NameForm onSubmit={signIn} />}
        {state.status === 'offline' && (
          <p className="panel muted">The server is out of reach: practice still works.</p>
        )}
      </div>
      {state.status === 'signed-in' && (
        <p className="home__who muted">
          Playing as <strong>{state.player.name}</strong> ·{' '}
          <button type="button" className="link" onClick={signOut}>
            change name
          </button>
        </p>
      )}
    </main>
  );
}
