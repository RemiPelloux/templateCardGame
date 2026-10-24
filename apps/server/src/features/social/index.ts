import type { Feature, Services } from '../../core/feature';
import { every } from '../../core/schedule';
import { SWEEP_MS } from './limits';
import { socialMigrations } from './migrations';
import { socialRoutes } from './routes';
import { SocialService } from './service';

/** One service per running server (tests start many), built on first use. */
const instances = new WeakMap<Services, SocialService>();
export const socialOf = (services: Services) => {
  const existing = instances.get(services);
  if (existing) return existing;
  const created = new SocialService(services);
  instances.set(services, created);
  return created;
};

/** Friends, presence, table invites, blocks and reports. See docs/social.md. */
export const socialFeature: Feature = {
  name: 'social',
  migrations: socialMigrations,
  routes: (router, services) => socialRoutes(router, services, socialOf(services)),
  tick: every(SWEEP_MS, (services) => socialOf(services).invites.sweep()),
  exportData: (accountId, services) => socialOf(services).exportData(accountId),
};
