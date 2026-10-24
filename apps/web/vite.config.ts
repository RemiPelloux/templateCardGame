import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { game } from '@cardgame/game';
import { gameServerPlugin } from '@cardgame/server/vite-plugin';

/** The manifest's colours: `theme-color` in index.html and `--canvas` in styles/tokens.css. */
const THEME_COLOR = '#14532d';
const BACKGROUND_COLOR = '#f4f1ea';

/**
 * Installable and offline-capable: the service worker precaches the built app, so practice
 * (which runs in the browser) works without a network. `registerType: 'prompt'` lets the player
 * choose when to load a new version (features/pwa). The API is never cached.
 */
const pwa = VitePWA({
  registerType: 'prompt',
  injectRegister: false,
  includeAssets: ['favicon.svg', 'icons/*.png'],
  manifest: {
    id: '/',
    // The installed app is named after the game being played (packages/game).
    name: game.name,
    short_name: game.name,
    description: 'A card game you can play against bots or with friends.',
    theme_color: THEME_COLOR,
    background_color: BACKGROUND_COLOR,
    display: 'standalone',
    categories: ['games'],
    start_url: '/',
    scope: '/',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api(?:\/|$)/],
    cleanupOutdatedCaches: true,
  },
});

/** `pnpm dev` serves the app and the real API (rooms, bots, SQLite) on one port. */
export default defineConfig({
  plugins: [react(), gameServerPlugin(), pwa],
  build: { target: 'es2022' },
});
