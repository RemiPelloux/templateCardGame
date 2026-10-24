/// <reference types="vite-plugin-pwa/vanillajs" />
import { registerSW } from 'virtual:pwa-register';
import { pwaStatus } from './status';

function watchConnection() {
  pwaStatus.setOnline(navigator.onLine);
  addEventListener('online', () => pwaStatus.setOnline(true));
  addEventListener('offline', () => pwaStatus.setOnline(false));
}

/**
 * Registers the service worker and offers updates. `registerType: 'prompt'` means a new version
 * waits until the player chooses to reload, so a match in progress is never interrupted.
 */
export function registerServiceWorker() {
  watchConnection();
  if (!('serviceWorker' in navigator)) return;
  const update = registerSW({
    onNeedRefresh: () => pwaStatus.offerUpdate(() => void update(true)),
  });
}
