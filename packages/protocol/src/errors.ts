/**
 * Every refusal has the same body. Clients translate `code` (with `params`); `message` is the
 * English fallback for codes a client does not know yet.
 */
export type ErrorBody = {
  error: { code: string; message: string; params?: Record<string, string | number> };
};
