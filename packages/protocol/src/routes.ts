/**
 * Every address of the app, declared once. The web router renders them; the server answers them
 * with the app's HTML shell and returns a real 404 for anything else.
 */
export type Route = { name: 'home' } | { name: 'practice' } | { name: 'room'; code: string };

const ROOM_PATH = /^\/room\/([A-Za-z0-9]+)\/?$/;

export function parseRoute(path: string): Route | null {
  if (path === '/') return { name: 'home' };
  if (path === '/practice') return { name: 'practice' };
  const room = ROOM_PATH.exec(path);
  return room ? { name: 'room', code: room[1]!.toUpperCase() } : null;
}

export function routePath(route: Route): string {
  if (route.name === 'room') return `/room/${route.code}`;
  return route.name === 'home' ? '/' : `/${route.name}`;
}

/** JSON endpoints, relative to the app's origin. */
export const api = {
  health: '/api/health',
  session: '/api/session',
  rooms: '/api/rooms',
  room: (code: string) => `/api/rooms/${code}`,
  join: (code: string) => `/api/rooms/${code}/join`,
  leave: (code: string) => `/api/rooms/${code}/leave`,
  seats: (code: string) => `/api/rooms/${code}/seats`,
  start: (code: string) => `/api/rooms/${code}/start`,
  commands: (code: string) => `/api/rooms/${code}/commands`,
  events: (code: string) => `/api/rooms/${code}/events`,
} as const;
