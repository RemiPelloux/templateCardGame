import { beforeEach, describe, expect, it } from 'vitest';
import type { Player } from '@cardgame/protocol';
import type { Services } from '../src/core/feature';
import { signUp, testServices } from './support';

let services: Services;
let ada: Player;
beforeEach(async () => {
  ({ services } = testServices());
  ada = await signUp(services, 'ada');
});

describe('wallet', () => {
  it('credits once per reference and refuses to go below zero', () => {
    expect(services.wallet.credit(ada.id, { amount: 100, reason: 'reward', ref: 'match-1' })).toBe(
      true,
    );
    expect(services.wallet.credit(ada.id, { amount: 100, reason: 'reward', ref: 'match-1' })).toBe(
      false,
    );
    expect(services.wallet.balance(ada.id)).toBe(100);
    expect(() => services.wallet.debit(ada.id, { amount: 150, reason: 'shop' })).toThrow(
      /Not enough/,
    );
    services.wallet.debit(ada.id, { amount: 40, reason: 'shop' });
    expect(services.wallet.balance(ada.id)).toBe(60);
    expect(services.wallet.history(ada.id).map((m) => m.delta)).toEqual([-40, 100]);
  });
});

describe('inventory', () => {
  it('owns starters, grants once, and equips only owned items in their slot', () => {
    expect(services.inventory.owns(ada.id, 'back-ember')).toBe(true);
    expect(services.inventory.equipped(ada.id).cardBack).toBe('back-ember');
    expect(() => services.inventory.equip(ada.id, 'cardBack', 'back-ocean')).toThrow(/own/);
    expect(services.inventory.grant(ada.id, 'back-ocean', 'shop')).toBe(true);
    expect(services.inventory.grant(ada.id, 'back-ocean', 'shop')).toBe(false);
    services.inventory.equip(ada.id, 'cardBack', 'back-ocean');
    expect(services.inventory.equipped(ada.id).cardBack).toBe('back-ocean');
    expect(() => services.inventory.equip(ada.id, 'felt', 'back-ocean')).toThrow(/go there/);
  });
});
