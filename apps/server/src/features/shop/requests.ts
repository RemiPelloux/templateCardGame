import { randomUUID } from 'node:crypto';
import { readOptional, readString } from '@cardgame/engine';
import { SHOP_REQUEST_MAX_LENGTH } from '@cardgame/protocol';

const ID_MAX_LENGTH = 64;

/** A shop request's shape: the product id and an idempotency key (a fresh one when absent). */
export function productRequest(body: Record<string, unknown>, field: 'item' | 'booster') {
  const product = readString(body[field], field, ID_MAX_LENGTH);
  const request = readOptional(body.request, (v) =>
    readString(v, 'request', SHOP_REQUEST_MAX_LENGTH),
  );
  return { product, request: request ?? randomUUID() };
}
