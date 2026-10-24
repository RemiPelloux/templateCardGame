import { mergeBundles, type Messages } from '@cardgame/i18n';
import { account } from '../features/account/i18n';
import { collection } from '../features/collection/i18n';
import { daily } from '../features/daily/i18n';
import { dlc } from '../features/dlc/i18n';
import { friends } from '../features/friends/i18n';
import { home } from '../features/home/i18n';
import { practice } from '../features/practice/i18n';
import { profile } from '../features/profile/i18n';
import { progression } from '../features/progression/i18n';
import { pwa } from '../features/pwa/i18n';
import { ranked } from '../features/ranked/i18n';
import { rooms } from '../features/rooms/i18n';
import { rules } from '../features/rules/i18n';
import { shop } from '../features/shop/i18n';
import { telemetry } from '../features/telemetry/i18n';
import { game } from '../game/i18n';
import { table } from '../table/i18n';
import { common } from './common';

/**
 * Every namespace of the app. Each feature keeps its text in its own `i18n.ts`, next to its
 * code; a new namespace is one line here. Keys read `namespace.path`: `t('shop.title')`.
 */
const bundles = {
  common,
  account,
  collection,
  daily,
  dlc,
  friends,
  game,
  home,
  practice,
  profile,
  progression,
  pwa,
  ranked,
  rooms,
  rules,
  shop,
  table,
  telemetry,
};

export const messages = mergeBundles(bundles);
export type AppMessages = Messages<typeof bundles>;
