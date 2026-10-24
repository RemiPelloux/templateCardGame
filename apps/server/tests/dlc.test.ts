import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { RuleError } from '@cardgame/engine';
import { expansions } from '@cardgame/game';
import { itemById } from '@cardgame/meta';
import { dlcApi, type ExpansionCatalog, type Player } from '@cardgame/protocol';
import { createApplication } from '../src/app';
import type { Services } from '../src/core/feature';
import { catalog } from '../src/features/dlc/catalog';
import { dlcFeature } from '../src/features/dlc';
import { signUp, testConfig, testServices } from './support';

const JOKERS = { expansion: 'jokers' };

let services: Services;
let alice: Player;
let bob: Player;

beforeEach(async () => {
  ({ services } = testServices());
  dlcFeature.start!(services);
  alice = await signUp(services, 'alice');
  bob = await signUp(services, 'bob');
});

const tableOf = (host: Player, guest: Player) => {
  const { code } = services.rooms.create(host);
  services.rooms.join(code, guest);
  return code;
};

describe('expansion catalog', () => {
  it('links every expansion to an expansion item the shop can sell', () => {
    for (const { manifest } of expansions.list) {
      const item = itemById(manifest.item);
      expect(item?.kind).toBe('expansion');
      expect(item?.price).toBeGreaterThan(0);
    }
  });

  it('tells a member which expansions they own, and a guest none', () => {
    expect(catalog(null, services).expansions.map((e) => e.owned)).toEqual([false]);
    expect(catalog(alice.id, services).expansions[0]).toMatchObject({ id: 'jokers', owned: false });
    services.inventory.grant(alice.id, 'expansion-jokers', 'shop');
    expect(catalog(alice.id, services).expansions[0]).toMatchObject({
      id: 'jokers',
      item: 'expansion-jokers',
      rulesVersion: 1,
      owned: true,
    });
  });
});

describe('choosing an expansion for a table', () => {
  it('lets only a host who owns it pick it', () => {
    const code = tableOf(alice, bob);
    expect(() => services.rooms.setOptions(code, alice, { options: JOKERS })).toThrow(
      expect.objectContaining({ code: 'EXPANSION_NOT_OWNED' }),
    );
    services.inventory.grant(bob.id, 'expansion-jokers', 'shop');
    expect(() => services.rooms.setOptions(code, bob, { options: JOKERS })).toThrow(/host/);
    services.inventory.grant(alice.id, 'expansion-jokers', 'shop');
    const view = services.rooms.setOptions(code, alice, { options: JOKERS });
    expect(view.options).toMatchObject(JOKERS);
    const dealt = services.rooms.start(code, alice, {});
    expect(dealt.match?.state.expansion).toEqual({ id: 'jokers', rulesVersion: 1 });
  });

  it('checks again at the deal, when the host has changed', () => {
    const code = tableOf(alice, bob);
    services.inventory.grant(alice.id, 'expansion-jokers', 'shop');
    services.rooms.setOptions(code, alice, { options: JOKERS });
    services.rooms.leave(code, alice);
    services.rooms.seats(code, bob, { action: 'addBot' });
    expect(() => services.rooms.start(code, bob, {})).toThrow(/own/);
    services.rooms.setOptions(code, bob, { options: { expansion: null } });
    expect(services.rooms.start(code, bob, {}).match?.state.expansion).toBeNull();
  });

  it('refuses options the game does not accept, and leaves the room as it was', () => {
    const code = tableOf(alice, bob);
    expect(() =>
      services.rooms.setOptions(code, alice, { options: { expansion: 'nope' } }),
    ).toThrow(RuleError);
    expect(() => services.rooms.start(code, alice, { options: JOKERS })).toThrow(/own/);
    expect(services.rooms.view(code, alice)).toMatchObject({ status: 'lobby', options: {} });
  });
});

describe('expansions endpoint', () => {
  let app: ReturnType<typeof createApplication>;
  afterEach(() => app.close());

  it('answers guests too', async () => {
    app = createApplication(testConfig());
    await new Promise<void>((done) => app.server.listen(0, '127.0.0.1', done));
    const base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const response = await fetch(base + dlcApi.expansions);
    const body = (await response.json()) as ExpansionCatalog;
    expect(response.status).toBe(200);
    expect(body.expansions[0]).toMatchObject({ id: 'jokers', owned: false });
  });
});
