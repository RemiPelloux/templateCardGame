import type { ComponentType } from 'react';
import type { RoomView } from '@cardgame/protocol';
import { ResultPanel } from '../progression/ResultPanel';
import { LobbyInvites } from '../friends/LobbyInvites';
import { DailyResultPanel } from '../daily/DailyResultPanel';
import { RankedResultPanel } from '../ranked/RankedResultPanel';
import { ExpansionPanel } from '../dlc/ExpansionPanel';
import type { RoomHandle } from './useRoom';

export type RoomSlotProps = { room: RoomView; handle: RoomHandle };

/**
 * Where other features add to a table without editing the room screens. Each panel decides
 * for itself when to show (return null otherwise). One line per feature, in display order.
 */

/** Under the seats in the lobby: the expansion picker, inviting friends… */
export const LOBBY_PANELS: ComponentType<RoomSlotProps>[] = [ExpansionPanel, LobbyInvites];

/** Under the result once a match ends: experience gained, daily score, rating change… */
export const RESULT_PANELS: ComponentType<RoomSlotProps>[] = [
  ResultPanel,
  DailyResultPanel,
  RankedResultPanel,
];
