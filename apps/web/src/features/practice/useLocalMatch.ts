import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  act,
  actorsOf,
  botCommand,
  createMatch,
  isRuleError,
  viewMatch,
  type Match,
} from '@cardgame/engine';
import { bots, DEFAULT_BOT, game, type Command, type Options, type State } from '@cardgame/game';
import { useI18n } from '../../i18n/I18nProvider';
import type { MatchController } from '../../table/controller';
import { loadPractice, savePractice } from './practice-storage';

/** The person always sits in seat 0 of a practice match. */
const HUMAN_SEAT = 0;
/** The pause before a bot moves, so the person can follow. */
const BOT_DELAY_MS = 700;

type PracticeMatch = Match<State, Command, Options>;

/** A fresh deal; `expansion` null plays the classic game. */
const deal = (players: number, expansion: string | null = null): PracticeMatch =>
  createMatch(game, { players, options: { expansion } });

/**
 * A match against bots, entirely in the browser: works offline, earns nothing, and is not
 * protected against cheating (the full state is local). Online rooms are the authoritative mode.
 */
export function useLocalMatch(players: number): MatchController & {
  restart(): void;
  /** The expansion this practice plays, null for the classic game. */
  expansion: string | null;
  /** Deals again with another expansion (or null: the classic game). */
  switchExpansion(expansion: string | null): void;
} {
  const { t, errorText } = useI18n();
  const [match, setMatch] = useState<PracticeMatch>(() => loadPractice() ?? deal(players));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => savePractice(match), [match]);

  useEffect(() => {
    const seat = actorsOf(game, match).find((s) => s !== HUMAN_SEAT);
    if (seat === undefined) return;
    const timer = setTimeout(() => {
      const command = botCommand(game, match, { seat, bot: bots[DEFAULT_BOT]! });
      setMatch(act(game, match, { seat, command }));
    }, BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [match]);

  const send = useCallback(
    (command: Command) => {
      try {
        setMatch(act(game, match, { seat: HUMAN_SEAT, command }));
        setError(null);
      } catch (refused) {
        if (!isRuleError(refused)) throw refused;
        setError(errorText(refused));
      }
    },
    [match, errorText],
  );
  const expansion = match.options.expansion ?? null;
  const restart = useCallback(() => setMatch(deal(players, expansion)), [players, expansion]);
  const switchExpansion = useCallback(
    (next: string | null) => setMatch(deal(players, next)),
    [players],
  );
  const view = useMemo(() => viewMatch(game, match, HUMAN_SEAT), [match]);
  const names = useMemo(
    () =>
      Array.from({ length: match.players }, (_, i) =>
        i ? t('table.bot', { n: i }) : t('table.you'),
      ),
    [match.players, t],
  );
  const seatsAreBots = useMemo(() => names.map((_, i) => i !== HUMAN_SEAT), [names]);
  return {
    view,
    names,
    bots: seatsAreBots,
    send,
    busy: false,
    error,
    dismissError: () => setError(null),
    rematch: restart,
    restart,
    expansion,
    switchExpansion,
  };
}
