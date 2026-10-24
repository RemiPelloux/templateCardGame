/**
 * Every page of the app, declared once. The web router renders them; the server answers them
 * with the app's HTML shell and returns a real 404 for anything else.
 */
export type Route =
  | { name: 'home' }
  | { name: 'practice' }
  | { name: 'room'; code: string }
  | { name: 'login' }
  | { name: 'register' }
  | { name: 'recover' }
  | { name: 'account' }
  | { name: 'profile'; handle?: string }
  | { name: 'shop' }
  | { name: 'collection' }
  | { name: 'friends' }
  | { name: 'daily' }
  | { name: 'ranked' }
  | { name: 'rules' };

export type RouteName = Route['name'];

/** Pages without a parameter, by path. */
const STATIC: Record<string, RouteName> = {
  '/': 'home',
  '/practice': 'practice',
  '/login': 'login',
  '/register': 'register',
  '/recover': 'recover',
  '/account': 'account',
  '/profile': 'profile',
  '/shop': 'shop',
  '/collection': 'collection',
  '/friends': 'friends',
  '/daily': 'daily',
  '/ranked': 'ranked',
  '/rules': 'rules',
};
const ROOM_PATH = /^\/room\/([A-Za-z0-9]+)\/?$/;
/** `/profile/ada-1234`: a handle `name#tag` travels as `name-tag` in paths. */
const PROFILE_PATH = /^\/profile\/([a-z0-9_]+-\d{4})\/?$/;

export function parseRoute(path: string): Route | null {
  const name = STATIC[path.length > 1 ? path.replace(/\/$/, '') : path];
  if (name) return { name } as Route;
  const room = ROOM_PATH.exec(path);
  if (room) return { name: 'room', code: room[1]!.toUpperCase() };
  const profile = PROFILE_PATH.exec(path);
  return profile ? { name: 'profile', handle: profile[1]!.replace(/-(\d{4})$/, '#$1') } : null;
}

export function routePath(route: Route): string {
  if (route.name === 'room') return `/room/${route.code}`;
  if (route.name === 'profile' && route.handle) return `/profile/${route.handle.replace('#', '-')}`;
  return route.name === 'home' ? '/' : `/${route.name}`;
}

export const api = { health: '/api/health' } as const;
