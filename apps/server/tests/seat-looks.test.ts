import { describe, expect, it } from 'vitest';
import { signUp, testServices } from './support';

describe('seat looks', () => {
  it('shows what each person wears at the table, and nothing for bots', async () => {
    const { services } = testServices();
    const ada = await signUp(services, 'ada');
    services.inventory.grant(ada.id, 'frame-silver', 'test');
    services.inventory.equip(ada.id, 'frame', 'frame-silver');
    const { code } = services.rooms.create(ada);
    const view = services.rooms.seats(code, ada, { action: 'addBot' });
    expect(view.seats[0]!.looks).toEqual(services.inventory.equipped(ada.id));
    expect(view.seats[0]!.looks?.frame).toBe('frame-silver');
    expect(view.seats[1]!.looks).toBeNull();
  });
});
