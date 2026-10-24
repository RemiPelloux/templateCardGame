import { resolve } from 'node:path';

const DEFAULT_PORT = 3000;

/** scrypt cost: N, r, p. Memory used is 128 × N × r bytes per derivation. */
export type PasswordCost = { N: number; r: number; p: number };
/** About 0.3 s and 128 MiB per derivation on one core: the production cost. */
export const PRODUCTION_COST: PasswordCost = { N: 2 ** 17, r: 8, p: 1 };
/** Fast and weak: test servers only, refused in production. */
export const TEST_COST: PasswordCost = { N: 2 ** 10, r: 8, p: 1 };

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
  passwordCost: PasswordCost;
  /** Test servers run many members from one address: limits are lifted. Never in production. */
  relaxedLimits: boolean;
  /** Where server errors are announced (ntfy, Discord, Slack); unset sends nothing. */
  alertWebhookUrl: string | undefined;
};

/** Reads the environment once, and refuses to start a production server that is misconfigured. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  const config: Config = {
    port: Number(env.PORT ?? DEFAULT_PORT),
    host: env.HOST ?? '0.0.0.0',
    dbPath: env.DB_PATH ?? 'data/game.sqlite',
    staticDir: env.STATIC_DIR ?? resolve(import.meta.dirname, '../../../web/dist'),
    publicOrigin: env.PUBLIC_ORIGIN || undefined,
    trustProxy: env.TRUST_PROXY === '1',
    production,
    logging: env.LOG_REQUESTS !== '0',
    passwordCost: env.PASSWORD_COST === 'test' ? TEST_COST : PRODUCTION_COST,
    relaxedLimits: env.RELAXED_LIMITS === '1',
    alertWebhookUrl: env.ALERT_WEBHOOK_URL || undefined,
  };
  if (production) checkProduction(config);
  return config;
}

function checkProduction(config: Config) {
  if (!config.publicOrigin?.startsWith('https://'))
    throw new Error('Production needs PUBLIC_ORIGIN set to the exact https:// origin.');
  if (config.passwordCost !== PRODUCTION_COST || config.relaxedLimits)
    throw new Error('PASSWORD_COST and RELAXED_LIMITS are for test servers only.');
}
