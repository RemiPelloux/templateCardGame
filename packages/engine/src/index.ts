/**
 * @cardgame/engine — a game-agnostic kernel for turn-based card games.
 *
 * Describe a game once as a `GameDefinition` (packages/game); the engine deals matches, applies
 * commands, projects per-seat views, drives bots, simulates and replays. Pure and synchronous:
 * no I/O, no timers, no DOM, no Node.
 */
export type {
  AnyGameDefinition,
  GameDefinition,
  LogEntry,
  LogOptions,
  MoveContext,
  Outcome,
  Seat,
  SetupContext,
} from './definition';
export { RuleError, isRuleError } from './errors';
export { clone } from './platform';
export { createRng, deriveSeed, randomSeed, type Rng, type RngHolder } from './rng';
export {
  act,
  actorsOf,
  createMatch,
  isOver,
  MAX_LOG,
  type HistoryEntry,
  type Match,
  type NewMatch,
} from './match';
export { viewMatch, visibleTo, VIEW_LOG, type MatchView } from './view';
export { botCommand, greedyBot, randomBot, type Bot, type BotTurn } from './bots';
export { simulate, DEFAULT_MAX_MOVES, type Simulation } from './simulate';
export { isReproducible, replay } from './replay';
export { checkConformance, type ConformanceOptions, type ConformanceReport } from './conformance';
export { drawFrom, findById, moveById, takeById, topOf, type Identified } from './zones';
export {
  isSuit,
  rankOrder,
  RANKS,
  SUITS,
  standardDeck,
  type PlayingCard,
  type Rank,
  type Suit,
} from './standard-deck';
export {
  readBoolean,
  readInteger,
  readOneOf,
  readOptional,
  readRecord,
  readString,
} from './guards';
export {
  createExpansionRegistry,
  type Expansion,
  type ExpansionChoice,
  type ExpansionManifest,
  type ExpansionRegistry,
} from './expansions';
