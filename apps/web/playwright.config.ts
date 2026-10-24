import { defineConfig, devices } from '@playwright/test';

/** A private port and an in-memory database: the suite never touches a dev server or real data. */
const PORT = 4317;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  workers: 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure', locale: 'en-GB' },
  // One browser keeps a run light; add projects (phone, Firefox…) when the game needs them.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm build && pnpm --filter @cardgame/server start`,
    url: `http://127.0.0.1:${PORT}/api/health`,
    reuseExistingServer: false,
    env: {
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DB_PATH: ':memory:',
      LOG_REQUESTS: '0',
      PASSWORD_COST: 'test',
      RELAXED_LIMITS: '1',
    },
  },
});
