/** Shared limits: the client checks them for instant feedback, the server enforces them. */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
/** Lowercase letters, digits and underscores: easy to type, read aloud and share. */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;
export const ROOM_CODE_LENGTH = 5;
/** No 0/O or 1/I: codes are read aloud and typed on phones. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export const normalizeRoomCode = (input: string) => input.trim().toUpperCase();
export const isRoomCode = (input: string) => ROOM_CODE_PATTERN.test(input);
