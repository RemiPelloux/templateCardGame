import type { IncomingMessage, ServerResponse } from 'node:http';
import { ApiError } from './errors';

export const MAX_BODY_BYTES = 64 * 1024;
const UNSUPPORTED = 415;
const TOO_LARGE = 413;

/** Reads a JSON object body, refusing other content types, oversized bodies and non-objects. */
export async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? ''))
    throw new ApiError('Send JSON.', 'UNSUPPORTED_MEDIA', UNSUPPORTED);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) throw new ApiError('Request too large.', 'TOO_LARGE', TOO_LARGE);
    chunks.push(chunk as Buffer);
  }
  let value: unknown;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new ApiError('Invalid JSON.', 'INVALID_JSON');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new ApiError('Invalid request.', 'INVALID_INPUT');
  return value as Record<string, unknown>;
}

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

export function readCookie(req: IncomingMessage, name: string): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return undefined;
}
