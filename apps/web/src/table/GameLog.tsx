import { gameUi } from '../game';
import type { MatchController } from '../play/controller';

const SHOWN = 12;

/** The latest events, newest first; announced politely to screen readers. */
export function GameLog({ controller }: { controller: MatchController }) {
  const entries = controller.view.log.slice(0, SHOWN);
  return (
    <section className="log" aria-label="Game log">
      <h2 className="log__title">Log</h2>
      <ol className="log__list" aria-live="polite">
        {entries.map((entry) => (
          <li key={entry.seq}>{gameUi.describe(entry, controller.names)}</li>
        ))}
      </ol>
    </section>
  );
}
