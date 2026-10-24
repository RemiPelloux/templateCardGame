import { resolve } from 'node:path';

const DEFAULT_PORT = 3000;

export type Config = {
  port: number;
  host: string;
  dbPath: string;
  /** The built web app the server hands out (apps/web/dist). */
  staticDir: string;
  publicOrigin: string | undefined;
  trustProxy: boolean;
  production: boolean;
  /** Logs one JSON line per request. */
  logging: boolean;
};

/** Reads the environment once, and refuses to start a production server that is misconfigured. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const config: Config = {
    port: Number(env.PORT ?? DEFAULT_PORT),
    host: env.HOST ?? '0.0.0.0',
    dbPath: env.DB_PATH ?? 'data/game.sqlite',
    staticDir: env.STATIC_DIR ?? resolve(import.meta.dirname, '../../web/dist'),
    publicOrigin: env.PUBLIC_ORIGIN || undefined,
    trustProxy: env.TRUST_PROXY === '1',
    production,
    logging: env.LOG_REQUESTS !== '0',
  };
  if (production && !config.publicOrigin?.startsWith('https://'))
    throw new Error('Production needs PUBLIC_ORIGIN set to the exact https:// origin.');
  return config;
}
