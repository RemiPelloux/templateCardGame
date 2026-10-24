import type { Services } from './feature';

/**
 * Wraps a feature's `tick` so it runs at most once per `intervalMs` (ticks come every 200 ms):
 * `tick: every(HOUR_MS, sweep)`.
 */
export function every(intervalMs: number, task: (services: Services) => void) {
  let next = 0;
  return (services: Services) => {
    const now = services.now();
    if (now < next) return;
    next = now + intervalMs;
    task(services);
  };
}
