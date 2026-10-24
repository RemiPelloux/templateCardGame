import type { RouteName } from '@cardgame/protocol';
import type { MessageKey } from '@cardgame/i18n';
import type { AppMessages } from '../i18n/messages';

export type NavItem = { route: RouteName; label: MessageKey<AppMessages>; icon: string };

/** The tab bar (phones) and header links (desktop), in order. Five at most on a phone. */
export const NAV: readonly NavItem[] = [
  { route: 'home', label: 'common.nav.play', icon: '♠' },
  { route: 'daily', label: 'common.nav.daily', icon: '☀' },
  { route: 'shop', label: 'common.nav.shop', icon: '◆' },
  { route: 'friends', label: 'common.nav.friends', icon: '♥' },
  { route: 'profile', label: 'common.nav.profile', icon: '♣' },
];
