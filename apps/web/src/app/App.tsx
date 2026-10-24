import { HomeScreen } from '../screens/HomeScreen';
import { NameForm } from '../screens/NameForm';
import { PracticeScreen } from '../screens/PracticeScreen';
import { RoomScreen } from '../screens/RoomScreen';
import { useRoute } from './router';
import { useSession } from './session';

export function App() {
  const route = useRoute();
  const session = useSession();
  if (route.name === 'practice') return <PracticeScreen />;
  if (route.name === 'home') return <HomeScreen session={session} />;
  const { state } = session;
  if (state.status === 'signed-in') return <RoomScreen key={route.code} code={route.code} />;
  if (state.status === 'loading') return <main className="centered muted">Loading…</main>;
  return (
    <main className="centered">
      <h1 className="table__title">Join table {route.code}</h1>
      <NameForm onSubmit={session.signIn} />
    </main>
  );
}
