import { handleOf, type Player } from '@cardgame/protocol';
import { socialOf } from '../src/features/social';
import type { Services } from '../src/core/feature';
import { signUp, testServices } from './support';

/** Fresh services with three members and their social service. */
export async function socialWorld() {
  const { services, clock } = testServices();
  const social = socialOf(services);
  const [ada, bob, cyd] = await members(services, ['ada', 'bob', 'cyd']);
  /** `me` acting on `other`, the way the routes call the service. */
  const on = (me: Player, other: Player) => ({ me, handle: handleOf(other) });
  const befriend = (a: Player, b: Player) => {
    social.friends.request(on(a, b));
    social.friends.accept(on(b, a));
  };
  return { services, clock, social, ada: ada!, bob: bob!, cyd: cyd!, on, befriend };
}

/** Signs members up one after the other: password hashing refuses too many at once. */
export async function members(services: Services, names: string[]): Promise<Player[]> {
  const created: Player[] = [];
  for (const name of names) created.push(await signUp(services, name));
  return created;
}
