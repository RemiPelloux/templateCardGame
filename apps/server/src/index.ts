import { createApplication } from './app';
import { loadConfig } from './core/config';

/** A crashing process gets this long to record the error and send its alert, then exits. */
const CRASH_EXIT_MS = 5_000;

const config = loadConfig();
const app = createApplication(config);
app.server.listen(config.port, config.host, () =>
  console.log(JSON.stringify({ event: 'listening', port: config.port })),
);

let closing = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    app.close().then(
      () => process.exit(0),
      () => process.exit(1),
    );
  });

/**
 * State after an uncaught error is unknown, so the process still exits as Node would (code 1),
 * but first the error log and the alert webhook hear about it; the supervisor restarts it.
 */
for (const source of ['uncaughtException', 'unhandledRejection'] as const)
  process.once(source, (error: unknown) => {
    console.error(error);
    setTimeout(() => process.exit(1), CRASH_EXIT_MS).unref();
    void app.api.reportCrash({ error, source }).finally(() => process.exit(1));
  });
