import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useT } from '../../i18n/I18nProvider';
import type { RoomSlotProps } from '../rooms/slots';
import { signed } from './RankedBoards';
import { rankedKey, useRanked } from './useRanked';

/** Under a finished duel: how much my rating moved. */
export function RankedResultPanel({ room }: RoomSlotProps) {
  const t = useT();
  const client = useQueryClient();
  const isRanked = room.kind === 'ranked';
  const ranked = useRanked(isRanked);
  useEffect(() => {
    // The rating changed as the match ended: what the cache holds is from before.
    if (isRanked) void client.invalidateQueries({ queryKey: rankedKey });
  }, [client, isRanked]);
  if (!isRanked) return null;
  const game = ranked.data?.recent.find((g) => g.room === room.code);
  return (
    <div className="result-panel">
      <strong>{t('ranked.panel.title')}</strong>
      {game ? (
        <span>{t('ranked.panel.change', { delta: signed(game.delta), rating: game.rating })}</span>
      ) : (
        <span className="muted">{t('ranked.panel.pending')}</span>
      )}
    </div>
  );
}
