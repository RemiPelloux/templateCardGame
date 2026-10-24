import type { GameDefinition } from '@cardgame/engine';
import { GAME_ID, MAX_PLAYERS, MIN_PLAYERS, RULES_VERSION } from './constants';
import { outcome } from './outcome';
import { parseCommand, parseOptions } from './parse';
import { actors, apply, legalCommands } from './rules';
import { setup } from './setup';
import type { Command, Options, State, View } from './types';
import { view } from './view';

/** Crazy Eights, wired into the engine. This object is the whole game as the rest of the app knows it. */
export const game: GameDefinition<State, Command, View, Options> = {
  id: GAME_ID,
  name: 'Crazy Eights',
  rulesVersion: RULES_VERSION,
  players: { min: MIN_PLAYERS, max: MAX_PLAYERS },
  defaultOptions: { handSize: null },
  parseOptions,
  setup,
  actors,
  parseCommand,
  apply,
  legalCommands,
  outcome,
  view,
};
