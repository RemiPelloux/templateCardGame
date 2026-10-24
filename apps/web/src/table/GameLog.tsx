import { gameUi } from '../game';
import { useT } from '../i18n/I18nProvider';
import type { MatchController } from './controller';

const SHOWN = 12;

/** The latest events, newest first; announced politely to screen readers. */
export function GameLog({ controller }: { controller: MatchController }) {
  const t = useT();
  const entries = controller.view.log.slice(0, SHOWN);
  return (
    <section className="log" aria-label={t('table.log')}>
      <h2 className="log__title">{t('table.log')}</h2>
      <ol className="log__list" aria-live="polite">
        {entries.map((entry) => (
          <li key={entry.seq}>{gameUi.describe(entry, controller.names, t)}</li>
        ))}
      </ol>
    </section>
  );
}
