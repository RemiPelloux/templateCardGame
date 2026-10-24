import { createExpansionRegistry } from '@cardgame/engine';
import type { Hooks } from '../hooks';

/**
 * Every expansion the game can be played with. Adding one is a folder next to this file and one
 * line here (`pnpm new:expansion <id> "Name"` writes both). Never remove an expansion that saved
 * matches may still use: raise its `oldestRulesVersion` instead.
 */
export const expansions = createExpansionRegistry<Hooks>([]);
