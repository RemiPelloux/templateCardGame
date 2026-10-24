import { useEffect, useState } from 'react';
import { parseRoute, routePath, type Route } from '@cardgame/protocol';

const NAVIGATE = 'app:navigate';

const current = (): Route => parseRoute(location.pathname) ?? { name: 'home' };

/** Changes page without reloading; the back and forward buttons keep working. */
export function navigate(route: Route, replace = false) {
  const path = routePath(route);
  if (path !== location.pathname) history[replace ? 'replaceState' : 'pushState'](null, '', path);
  window.dispatchEvent(new Event(NAVIGATE));
}

export function useRoute(): Route {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const update = () => setRoute(current());
    window.addEventListener('popstate', update);
    window.addEventListener(NAVIGATE, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAVIGATE, update);
    };
  }, []);
  return route;
}
