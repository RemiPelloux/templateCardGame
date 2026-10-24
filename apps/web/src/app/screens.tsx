import { lazy, type ComponentType } from 'react';
import type { Route, RouteName } from '@cardgame/protocol';

/** Screens take their route's parameters as props (`code`, `handle`), or none. */
type Screen = ComponentType<any>;

const named = <K extends string>(load: () => Promise<Record<K, Screen>>, name: K) =>
  lazy(() => load().then((module) => ({ default: module[name] })));

/**
 * Every page, loaded on demand so the first screen stays light. Add a page: a route in
 * packages/protocol/src/routes.ts, a line here, and (if it needs an account) `ACCOUNT_ONLY`.
 */
export const SCREENS: Record<RouteName, Screen> = {
  home: named(() => import('../features/home/HomeScreen'), 'HomeScreen'),
  practice: named(() => import('../features/practice/PracticeScreen'), 'PracticeScreen'),
  room: named(() => import('../features/rooms/RoomScreen'), 'RoomScreen'),
  login: named(() => import('../features/account/AuthScreens'), 'LoginScreen'),
  register: named(() => import('../features/account/AuthScreens'), 'RegisterScreen'),
  recover: named(() => import('../features/account/AuthScreens'), 'RecoverScreen'),
  account: named(() => import('../features/account/AccountScreen'), 'AccountScreen'),
  profile: named(() => import('../features/profile/ProfileScreen'), 'ProfileScreen'),
  shop: named(() => import('../features/shop/ShopScreen'), 'ShopScreen'),
  collection: named(() => import('../features/collection/CollectionScreen'), 'CollectionScreen'),
  friends: named(() => import('../features/friends/FriendsScreen'), 'FriendsScreen'),
  daily: named(() => import('../features/daily/DailyScreen'), 'DailyScreen'),
  ranked: named(() => import('../features/ranked/RankedScreen'), 'RankedScreen'),
  rules: named(() => import('../features/rules/RulesScreen'), 'RulesScreen'),
};

/** Pages that need a signed-in member; guests are sent to sign in, then brought back. */
export const ACCOUNT_ONLY: ReadonlySet<RouteName> = new Set([
  'room',
  'account',
  'shop',
  'collection',
  'friends',
  'daily',
  'ranked',
  'profile',
]);

/**
 * Pages only for guests. Not `register`: right after signing up, the new member is already
 * signed in and must still see their recovery codes there.
 */
export const GUEST_ONLY: ReadonlySet<RouteName> = new Set(['login', 'recover']);

/** Pages played full-screen, without the tab bar. */
export const IMMERSIVE: ReadonlySet<RouteName> = new Set(['practice', 'room']);

/** A route's parameters as the screen's props. */
export const propsOf = (route: Route) =>
  route.name === 'room'
    ? { code: route.code }
    : route.name === 'profile'
      ? { handle: route.handle }
      : {};
