import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from '@cardgame/protocol';
import { ApiError } from '../../core/http/errors';

export const normalizeUsername = (value: unknown) =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

export function readUsername(value: unknown): string {
  const username = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(username))
    throw new ApiError('Usernames use 3 to 20 letters, digits or _.', 'INVALID_USERNAME', 400, {
      min: USERNAME_MIN_LENGTH,
      max: USERNAME_MAX_LENGTH,
    });
  return username;
}

export function readPassword(value: unknown): string {
  const password = typeof value === 'string' ? value : '';
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH)
    throw new ApiError('Passwords use 8 to 72 characters.', 'INVALID_PASSWORD', 400, {
      min: PASSWORD_MIN_LENGTH,
      max: PASSWORD_MAX_LENGTH,
    });
  return password;
}

/** A short, privacy-friendly label for a device: browser and system, never an address. */
export function deviceOf(agent = ''): string {
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /Firefox\//.test(agent)
      ? 'Firefox'
      : /Chrome\//.test(agent)
        ? 'Chrome'
        : /Safari\//.test(agent)
          ? 'Safari'
          : 'Browser';
  const system = /Android/.test(agent)
    ? 'Android'
    : /iPhone|iPad/.test(agent)
      ? 'iOS'
      : /Mac OS/.test(agent)
        ? 'macOS'
        : /Windows/.test(agent)
          ? 'Windows'
          : /Linux/.test(agent)
            ? 'Linux'
            : '';
  return system ? `${browser} · ${system}` : browser;
}
