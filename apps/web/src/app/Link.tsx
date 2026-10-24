import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import { routePath, type Route } from '@cardgame/protocol';
import { navigate } from './router';

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { to: Route };

/** An in-app link: changes page without reloading, while a modified click opens a new tab. */
export function Link({ to, onClick, ...props }: Props) {
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    navigate(to);
  };
  return <a href={routePath(to)} onClick={follow} {...props} />;
}
