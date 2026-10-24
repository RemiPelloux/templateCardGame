import { isIP } from 'node:net';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Config } from '../config';
import { forbidden } from './errors';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
].join('; ');

export function securityHeaders(res: ServerResponse, config: Config) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  if (config.publicOrigin?.startsWith('https://'))
    res.setHeader('Strict-Transport-Security', 'max-age=31536000');
}

/** The caller's address; X-Forwarded-For is trusted only behind the private proxy that sets it. */
export function clientAddress(req: IncomingMessage, config: Config) {
  const forwarded = req.headers['x-forwarded-for'];
  const address = typeof forwarded === 'string' ? forwarded.split(',')[0]!.trim() : '';
  return config.trustProxy && isIP(address) ? address : (req.socket.remoteAddress ?? 'unknown');
}

/**
 * Refuses cross-site writes: a browser always sends Origin on a cross-origin POST, so a page on
 * another site cannot play with a member's cookie. Same-origin requests pass.
 */
export function checkOrigin(req: IncomingMessage, config: Config) {
  const origin = req.headers.origin;
  if (req.method === 'GET' || req.method === 'HEAD' || !origin) return;
  const expected = config.publicOrigin ?? `http://${req.headers.host}`;
  const sameHost = new URL(origin).host === req.headers.host;
  if (origin !== expected && !sameHost) throw forbidden('Cross-site request refused.');
}
