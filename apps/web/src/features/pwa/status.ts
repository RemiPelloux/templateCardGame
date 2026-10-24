/**
 * What the PWA status bar shows: a waiting update and the connection. A tiny external store so
 * that `register.ts` (outside React) and the prompt (inside) share it without a context.
 */
type Snapshot = { updateReady: boolean; online: boolean };

let snapshot: Snapshot = { updateReady: false, online: true };
let applyUpdate: (() => void) | null = null;
const listeners = new Set<() => void>();

function set(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  listeners.forEach((listener) => listener());
}

export const pwaStatus = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  get: () => snapshot,
  /** A new version is installed and waiting; `apply` activates it and reloads the page. */
  offerUpdate(apply: () => void) {
    applyUpdate = apply;
    set({ updateReady: true });
  },
  reload: () => applyUpdate?.(),
  dismissUpdate: () => set({ updateReady: false }),
  setOnline: (online: boolean) => set({ online }),
};
