import type { ErrorBody } from '@cardgame/protocol';

const BAD_REQUEST = 400;

/** A refused request whose message is safe to show; anything else becomes a generic 500. */
export class ApiError extends Error {
  override readonly name = 'ApiError';
  constructor(
    message: string,
    readonly code: string,
    readonly status = BAD_REQUEST,
  ) {
    super(message);
  }
}

export const errorBody = (code: string, message: string): ErrorBody => ({
  error: { code, message },
});

export const notFound = (what = 'Not found.') => new ApiError(what, 'NOT_FOUND', 404);
export const forbidden = (what: string) => new ApiError(what, 'FORBIDDEN', 403);
export const unauthorized = () => new ApiError('Choose a name to play.', 'NO_SESSION', 401);
