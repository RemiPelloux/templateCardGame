import { expansions } from './expansions';
import type { Hooks, Table } from './hooks';
import type { Options } from './types';

const BASE_RULES: Hooks = {};
/** The classic game: no expansion. */
export const CLASSIC: Table = { expansion: null };

/** The hooks of the expansion a table plays with; none for the classic game. */
export function hooksOf(table: Table): Hooks {
  if (!table.expansion) return BASE_RULES;
  const expansion = expansions.get(table.expansion.id);
  // parseOptions refuses unknown ids, so this is a match saved with an expansion since removed.
  if (!expansion) throw new Error(`Unknown expansion ${table.expansion.id}.`);
  return expansion.hooks;
}

/** The expansion recorded in parsed options. */
export const tableOf = (options: Options): Table => ({
  expansion: !options.expansion
    ? null
    : {
        id: options.expansion,
        rulesVersion: options.expansionRules ?? expansions.playableVersion(options.expansion),
      },
});
