import { navigate } from '../../app/router';
import { useT } from '../../i18n/I18nProvider';
import { Table } from '../../table/Table';
import { Button } from '../../ui/Button';
import { ExpansionSelect } from '../dlc/ExpansionSelect';
import { useOwnedExpansions } from '../dlc/useExpansions';
import { savePractice } from './practice-storage';
import { useLocalMatch } from './useLocalMatch';

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
  const t = useT();
  const controller = useLocalMatch(players);
  const owned = useOwnedExpansions();
  const { expansion } = controller;
  // Members practise with the expansions they own; guests and offline players, the classic game.
  const choices = expansion && !owned.includes(expansion) ? [...owned, expansion] : owned;
  const actions = (
    <>
      {choices.length > 0 && (
        <ExpansionSelect
          value={expansion}
          choices={choices}
          onChange={controller.switchExpansion}
        />
      )}
      <Button variant="ghost" onClick={controller.restart}>
        {t('practice.newDeal')}
      </Button>
      <Button variant="secondary" onClick={() => navigate({ name: 'home' })}>
        {t('common.actions.leave')}
      </Button>
    </>
  );
  return <Table controller={controller} title={t('practice.title')} actions={actions} />;
}
