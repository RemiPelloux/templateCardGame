/** Shared limits: the client checks them for instant feedback, the server enforces them. */
export const NAME_MAX_LENGTH = 24;
export const ROOM_CODE_LENGTH = 5;
/** No 0/O or 1/I: codes are read aloud and typed on phones. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export const normalizeRoomCode = (input: string) => input.trim().toUpperCase();
export const isRoomCode = (input: string) => ROOM_CODE_PATTERN.test(input);
