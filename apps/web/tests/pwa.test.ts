import { describe, expect, it, vi } from 'vitest';
import { pwaStatus } from '../src/features/pwa/status';
import { telemetryAllowed } from '../src/features/telemetry/client';

describe('pwa status', () => {
  it('offers a waiting update, applies it on reload, and can be dismissed', () => {
    const listener = vi.fn();
    const stop = pwaStatus.subscribe(listener);
    const apply = vi.fn();
    pwaStatus.offerUpdate(apply);
    expect(pwaStatus.get().updateReady).toBe(true);
    pwaStatus.reload();
    expect(apply).toHaveBeenCalledOnce();
    pwaStatus.dismissUpdate();
    expect(pwaStatus.get().updateReady).toBe(false);
    pwaStatus.setOnline(false);
    expect(pwaStatus.get().online).toBe(false);
    expect(listener).toHaveBeenCalledTimes(3);
    stop();
  });
});

describe('telemetry consent', () => {
  const nav = (fields: object) => fields as Navigator;
  it('sends nothing when the browser asks not to be tracked', () => {
    expect(telemetryAllowed(nav({ doNotTrack: null }))).toBe(true);
    expect(telemetryAllowed(nav({ doNotTrack: '1' }))).toBe(false);
    expect(telemetryAllowed(nav({ doNotTrack: null, globalPrivacyControl: true }))).toBe(false);
  });
});
