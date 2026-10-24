import type { Player } from '@cardgame/protocol';
import { createServices } from '../src/api';
import { loadConfig } from '../src/core/config';
import type { Services } from '../src/core/feature';

/** A test server's configuration: in-memory database, cheap password hashing, no request logs. */
export const testConfig = () =>
  loadConfig({
    DB_PATH: ':memory:',
    LOG_REQUESTS: '0',
    PASSWORD_COST: 'test',
    STATIC_DIR: '/nonexistent',
  });

/** Every service on a fresh in-memory database, with a clock the test moves by hand. */
export function testServices() {
  const clock = { now: 1_000_000 };
  const services = createServices(testConfig(), () => clock.now);
  return { services, clock };
}

export const PASSWORD = 'correct horse';

/** A registered account, ready to play. */
export async function signUp(services: Services, username: string): Promise<Player> {
  const { account } = await services.accounts.register({
    username,
    password: PASSWORD,
    device: 'test',
  });
  return account.player;
}
