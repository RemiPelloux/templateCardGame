import type { Accounts } from '../features/accounts/accounts';
import type { Inventory } from '../features/economy/inventory';
import type { Wallet } from '../features/economy/wallet';
import type { RoomService } from '../features/rooms/room-service';
import type { Config } from './config';
import type { Db, Migration } from './database';
import type { DomainEvents } from './events';
import type { Attempts } from './http/attempts';
import type { Limiter } from './http/rate-limit';
import type { Router } from './http/router';

/**
 * What every feature can use. Core services are built before any feature starts; a feature
 * reaches another one only through these services or through `events`, never by import.
 */
export type Services = {
  db: Db;
  config: Config;
  now: () => number;
  events: DomainEvents;
  /** In-memory, per-minute request budgets. */
  limit: Limiter;
  /** Persistent counters for sensitive actions. */
  attempts: Attempts;
  accounts: Accounts;
  wallet: Wallet;
  inventory: Inventory;
  rooms: RoomService;
};

/**
 * A server feature: its tables, its endpoints and its background work, in one folder under
 * `features/`. Register it once in `features/index.ts`. Every member is optional but the name.
 */
export type Feature = {
  name: string;
  /** Applied in registry order, before any service starts. */
  migrations?: readonly Migration[];
  /** Subscribes to events and prepares state; runs once at start-up. */
  start?(services: Services): void;
  routes?(router: Router, services: Services): void;
  /** Background work, called every `TICK_MS` (bots, expiries, queues). */
  tick?(services: Services): void;
  /** This member's data, JSON-safe, for the account export. */
  exportData?(accountId: string, services: Services): unknown;
};
