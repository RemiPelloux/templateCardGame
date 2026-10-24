import type { ReactNode } from 'react';

type Props = { title: string; lede?: string; children?: ReactNode; narrow?: boolean };

/** A screen's frame: its heading and a readable column. */
export function Page({ title, lede, children, narrow }: Props) {
  return (
    <main className={`page ${narrow ? 'page--narrow' : ''}`}>
      <h1 className="page__title">{title}</h1>
      {lede && <p className="page__lede">{lede}</p>}
      {children}
    </main>
  );
}
