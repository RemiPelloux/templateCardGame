import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Link } from '../../app/Link';
import { keys } from '../../app/query';
import { useT } from '../../i18n/I18nProvider';
import type { RoomSlotProps } from '../rooms/slots';
import { dailyKey, lineParams, useDaily } from './useDaily';

/** Under a finished daily table: my score, my place in today's ranking and the reward. */
export function DailyResultPanel({ room }: RoomSlotProps) {
  const t = useT();
  const client = useQueryClient();
  const isDaily = room.kind === 'daily';
  const daily = useDaily(isDaily);
  useEffect(() => {
    if (!isDaily) return;
    // The result was recorded as the match ended: fetch it, and the coins it paid.
    void client.invalidateQueries({ queryKey: dailyKey });
    void client.invalidateQueries({ queryKey: keys.wallet });
  }, [client, isDaily]);
  const status = daily.data?.status;
  if (!isDaily || status?.state !== 'finished' || status.result.room !== room.code) return null;
  const { result } = status;
  return (
    <div className="result-panel">
      <strong>{t('daily.panel.title')}</strong>
      <span>{t('daily.result.line', lineParams(result, daily.data!.ranking.players))}</span>
      <span className="tag">{t('daily.result.reward', { count: result.reward })}</span>
      <Link to={{ name: 'daily' }}>{t('daily.panel.see')}</Link>
    </div>
  );
}
