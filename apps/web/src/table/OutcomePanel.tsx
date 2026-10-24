import { gameUi } from '../game';
import { useT } from '../i18n/I18nProvider';
import { Button } from '../ui/Button';
import type { MatchController } from './controller';

export function OutcomePanel({ controller }: { controller: MatchController }) {
  const t = useT();
  const { outcome, you } = controller.view;
  if (!outcome) return null;
  const winners = outcome.winners.map((seat) => controller.names[seat]!);
  const won = you !== null && outcome.winners.includes(you);
  const title = won
    ? t('table.outcome.youWin')
    : winners.length
      ? t('table.outcome.wins', { names: winners.join(t('table.outcome.and')) })
      : t('table.outcome.nobody');
  return (
    <section className="outcome" aria-live="assertive">
      <h2 className="outcome__title">{title}</h2>
      <p className="outcome__reason">{gameUi.outcomeReason(outcome, t)}</p>
      {outcome.scores && (
        <ol className="outcome__scores">
          {outcome.scores.map((score, seat) => (
            <li key={seat}>
              <span>{controller.names[seat]}</span>
              <strong>{score}</strong>
            </li>
          ))}
        </ol>
      )}
      {controller.rematch && (
        <Button onClick={controller.rematch}>{t('table.outcome.again')}</Button>
      )}
    </section>
  );
}
