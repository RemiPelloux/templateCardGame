import { useT } from '../../i18n/I18nProvider';
import { expansionUi } from '../../game/expansions';
import type { RoomSlotProps } from '../rooms/slots';
import { ExpansionSelect } from './ExpansionSelect';
import { useOwnedExpansions } from './useExpansions';

/**
 * In a casual lobby: which expansion the table plays. The host picks among the ones they own
 * (the server checks again); everyone else sees the choice.
 */
export function ExpansionPanel({ room, handle }: RoomSlotProps) {
  const t = useT();
  const owned = useOwnedExpansions();
  if (room.kind !== 'casual') return null;
  const chosen = room.options.expansion ?? null;
  const ui = expansionUi(chosen);
  // A choice the host no longer owns stays listed, so the select shows what the table plays.
  const choices = chosen && !owned.includes(chosen) ? [...owned, chosen] : owned;
  return (
    <div className="stack">
      <p className="muted">
        {ui ? t('dlc.playing', { name: ui.name(t) }) : t('dlc.playingClassic')}
      </p>
      {ui && <p className="muted">{ui.tagline(t)}</p>}
      {room.isHost && (
        <ExpansionSelect
          value={chosen}
          choices={choices}
          disabled={handle.busy}
          onChange={(expansion) => handle.options({ expansion })}
        />
      )}
      {room.isHost && !owned.length && <p className="muted">{t('dlc.shopHint')}</p>}
    </div>
  );
}
