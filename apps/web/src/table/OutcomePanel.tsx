import { Button } from '../components/Button';
import { gameUi } from '../game';
import type { MatchController } from '../play/controller';

const joinNames = (names: string[]) => names.join(' and ');

export function OutcomePanel({ controller }: { controller: MatchController }) {
  const { outcome, you } = controller.view;
  if (!outcome) return null;
  const winners = outcome.winners.map((seat) => controller.names[seat]!);
  const won = you !== null && outcome.winners.includes(you);
  return (
    <section className="outcome" aria-live="assertive">
      <h2 className="outcome__title">
        {won ? 'You win!' : winners.length ? `${joinNames(winners)} wins` : 'Nobody wins'}
      </h2>
      <p className="outcome__reason">{gameUi.outcomeReason(outcome)}</p>
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
      {controller.rematch && <Button onClick={controller.rematch}>Play again</Button>}
    </section>
  );
}
