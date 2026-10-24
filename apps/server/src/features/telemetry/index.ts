import type { Feature } from '../../core/feature';
import { every } from '../../core/schedule';
import { ErrorLog, errorLogMigration } from './error-log';
import { telemetryRoutes } from './routes';
import { TelemetryStore, telemetryMigration } from './store';

const HOUR_MS = 3_600_000;

/** Field measurements (web vitals, API timings, script errors) and the server's error log. */
export const telemetryFeature: Feature = {
  name: 'telemetry',
  migrations: [telemetryMigration, errorLogMigration],
  routes: (router, services) => telemetryRoutes(router, services),
  tick: every(HOUR_MS, ({ db, now }) => {
    new TelemetryStore(db, now).sweep();
    new ErrorLog(db, now).sweep();
  }),
};
