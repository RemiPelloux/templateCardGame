/**
 * The only platform features the engine relies on, reached through `globalThis` so the package
 * compiles without DOM or Node types. Anything else (fetch, timers, fs, window) is a compile
 * error in this package: the engine runs the same in a browser, a server, a worker or a test.
 */
type Platform = {
  structuredClone<T>(value: T): T;
  crypto: { getRandomValues<T extends Uint32Array>(array: T): T };
};

const platform = globalThis as unknown as Platform;

/** A deep copy of plain JSON-like data. */
export const clone = <T>(value: T): T => platform.structuredClone(value);

/** A cryptographically random 32-bit integer. */
export const randomUint32 = () => platform.crypto.getRandomValues(new Uint32Array(1))[0]!;
