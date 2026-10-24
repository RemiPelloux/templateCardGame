import type { ComponentType } from 'react';
import type { RoomView } from '@cardgame/protocol';
import type { RoomHandle } from './useRoom';

export type RoomSlotProps = { room: RoomView; handle: RoomHandle };

/**
 * Where other features add to a table without editing the room screens. Each panel decides
 * for itself when to show (return null otherwise). One line per feature, in display order.
 */

/** Under the seats in the lobby: the expansion picker, inviting friends… */
export const LOBBY_PANELS: ComponentType<RoomSlotProps>[] = [];

/** Under the result once a match ends: experience gained, daily score, rating change… */
export const RESULT_PANELS: ComponentType<RoomSlotProps>[] = [];
