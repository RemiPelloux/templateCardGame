import { navigate } from '../app/router';
import { Button } from '../components/Button';
import { savePractice } from '../play/practice-storage';
import { useLocalMatch } from '../play/useLocalMatch';
import { Table } from '../table/Table';

const PLAYERS_KEY = 'practice:players';
const FALLBACK_PLAYERS = 2;

/** Deals a fresh practice match for `players` and opens it. */
export function startPractice(players: number) {
  savePractice(null);
  try {
    sessionStorage.setItem(PLAYERS_KEY, String(players));
  } catch {
    // Storage blocked: the practice falls back to the default table size.
  }
  navigate({ name: 'practice' });
}

function chosenPlayers() {
  try {
    return Number(sessionStorage.getItem(PLAYERS_KEY)) || FALLBACK_PLAYERS;
  } catch {
    return FALLBACK_PLAYERS;
  }
}

export function PracticeScreen() {
  const players = chosenPlayers();
  const controller = useLocalMatch(players);
  const actions = (
    <>
      <Button variant="ghost" onClick={controller.restart}>
        New deal
      </Button>
      <Button variant="secondary" onClick={() => navigate({ name: 'home' })}>
        Leave
      </Button>
    </>
  );
  return <Table controller={controller} title="Practice" actions={actions} />;
}
