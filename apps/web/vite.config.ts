import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { gameServerPlugin } from '@cardgame/server/vite-plugin';

/** `pnpm dev` serves the app and the real API (rooms, bots, SQLite) on one port. */
export default defineConfig({
  plugins: [react(), gameServerPlugin()],
  build: { target: 'es2022' },
});
