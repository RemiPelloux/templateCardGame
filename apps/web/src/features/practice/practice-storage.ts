import type { Match } from '@cardgame/engine';
import { game, type Command, type Options, type State } from '@cardgame/game';

const KEY = `practice:${game.id}`;
type PracticeMatch = Match<State, Command, Options>;

/**
 * The practice match from the last visit, if it was played under the current rules (the
 * game's, and its expansion's: parseOptions refuses expansion rules no longer played).
 */
export function loadPractice(): PracticeMatch | null {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as PracticeMatch | null;
    if (saved?.game !== game.id || saved.rulesVersion !== game.rulesVersion) return null;
    game.parseOptions(saved.options);
    return saved;
  } catch {
    return null;
  }
}

export function savePractice(match: PracticeMatch | null) {
  try {
    if (match) localStorage.setItem(KEY, JSON.stringify(match));
    else localStorage.removeItem(KEY);
  } catch {
    // Private browsing or a full quota: practice simply will not resume.
  }
}
