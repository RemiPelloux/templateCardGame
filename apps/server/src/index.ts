import { createApplication } from './app';
import { loadConfig } from './core/config';

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
