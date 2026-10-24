import type { ErrorBody } from '@cardgame/protocol';

/** A refused request: the server's code and parameters (translated by the UI) and its English text. */
export class RequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly params?: Record<string, string | number>,
  ) {
    super(message);
  }
}

const NO_CONTENT = 204;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    });
  } catch {
    throw new RequestError('The server cannot be reached.', 'OFFLINE', 0);
  }
  if (response.status === NO_CONTENT) return undefined as T;
  const data = (await response.json().catch(() => null)) as (T & Partial<ErrorBody>) | null;
  if (!response.ok || !data) {
    const error = data?.error;
    throw new RequestError(
      error?.message ?? 'Something went wrong.',
      error?.code ?? 'UNKNOWN',
      response.status,
      error?.params,
    );
  }
  return data;
}

export const http = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown = {}) => request<T>('POST', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

export const isUnauthorized = (error: unknown) =>
  error instanceof RequestError && error.status === 401;
