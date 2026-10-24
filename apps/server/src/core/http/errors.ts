import type { ErrorBody } from '@cardgame/protocol';

const BAD_REQUEST = 400;
type ErrorParams = Record<string, string | number>;

/**
 * A refused request whose message is safe to show; anything else becomes a generic 500.
 * Clients translate `code` (with `params`); the English message is a fallback.
 */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  constructor(
    message: string,
    readonly code: string,
    readonly status = BAD_REQUEST,
    readonly params?: ErrorParams,
  ) {
    super(message);
  }
}

export const errorBody = (code: string, message: string, params?: ErrorParams): ErrorBody => ({
  error: { code, message, ...(params ? { params } : {}) },
});

export const notFound = (what = 'Not found.') => new ApiError(what, 'NOT_FOUND', 404);
export const forbidden = (what: string) => new ApiError(what, 'FORBIDDEN', 403);
export const unauthorized = () => new ApiError('Sign in to continue.', 'NO_SESSION', 401);
