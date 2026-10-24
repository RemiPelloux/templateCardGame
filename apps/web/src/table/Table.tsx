import type { ReactNode } from 'react';
import { useTableLooks } from '../features/collection/looks';
import { Notice } from '../ui/Notice';
import { gameUi } from '../game';
import type { MatchController } from './controller';
import { GameLog } from './GameLog';
import { OutcomePanel } from './OutcomePanel';
import { Seats } from './Seats';

type Props = {
  controller: MatchController;
  title: string;
  actions?: ReactNode;
  /** Shown under the result once the match is over (rewards, rating changes). */
  outcomeExtra?: ReactNode;
};

/** The generic table: seats on top, the game's board on the felt, the log alongside. */
export function Table({ controller, title, actions, outcomeExtra }: Props) {
  const { Board } = gameUi;
  // The viewer's own felt and card back recolour the table they see, wherever it is played.
  const looks = useTableLooks();
  return (
    <div className="table" style={looks}>
      <header className="table__bar">
        <h1 className="table__title">{title}</h1>
        <div className="table__actions">{actions}</div>
      </header>
      <Seats controller={controller} />
      <main className="table__felt">
        <Notice message={controller.error} onDismiss={controller.dismissError} />
        <OutcomePanel controller={controller}>{outcomeExtra}</OutcomePanel>
        <Board controller={controller} />
      </main>
      <GameLog controller={controller} />
    </div>
  );
}
