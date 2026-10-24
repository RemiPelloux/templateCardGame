import type { Feature } from '../core/feature';
import { accountsFeature } from './accounts';
import { dailyFeature } from './daily';
import { dlcFeature } from './dlc';
import { economyFeature } from './economy';
import { profileFeature } from './profile';
import { progressionFeature } from './progression';
import { rankedFeature } from './ranked';
import { roomsFeature } from './rooms';
import { shopFeature } from './shop';
import { socialFeature } from './social';
import { telemetryFeature } from './telemetry';

/**
 * Every server feature, in start-up order: migrations run in this order (accounts first, since
 * others reference its table). A new feature is a folder under features/ and one line here.
 */
export const FEATURES: readonly Feature[] = [
  accountsFeature,
  economyFeature,
  roomsFeature,
  dlcFeature,
  profileFeature,
  progressionFeature,
  shopFeature,
  socialFeature,
  dailyFeature,
  rankedFeature,
  telemetryFeature,
];
