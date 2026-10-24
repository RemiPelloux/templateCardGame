import { RuleError } from './errors';

/**
 * Expansions (DLC): boxes of extra cards and rules a game may be played with, at most one per
 * match. The engine only knows their identity and versions; what an expansion changes is the
 * game's business, through the `Hooks` its rules call at fixed extension points.
 */
export type ExpansionManifest = {
  /** Stable id, stored with every match dealt with the expansion. Never rename one. */
  id: string;
  /** Bump when the expansion's rules change incompatibly. */
  rulesVersion: number;
  /** The oldest version the code still plays: saved matches dealt with it keep their rules. */
  oldestRulesVersion: number;
  /** The item a member must own to choose it for a table (`@cardgame/meta` catalog). */
  item: string;
};

export type Expansion<Hooks> = { manifest: ExpansionManifest; hooks: Hooks };

/** What a match records: which expansion it was dealt with, under which rules. */
export type ExpansionChoice = { id: string; rulesVersion: number };

export type ExpansionRegistry<Hooks> = {
  readonly list: readonly Expansion<Hooks>[];
  readonly ids: readonly string[];
  get(id: string): Expansion<Hooks> | undefined;
  isId(value: unknown): value is string;
  /** The rules version to play: `version` if still supported, the current one when absent. */
  playableVersion(id: string, version?: number): number;
  /** Untrusted options (`expansion`, `expansionRules`) into a choice; null plays the base game. */
  read(id: unknown, version?: unknown): ExpansionChoice | null;
};

/** Ids end up in URLs, item ids and translation keys: keep them kebab-case. */
const KEBAB_ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function checkManifest({ id, rulesVersion, oldestRulesVersion }: ExpansionManifest) {
  const valid =
    Number.isInteger(oldestRulesVersion) &&
    oldestRulesVersion >= 1 &&
    Number.isInteger(rulesVersion) &&
    rulesVersion >= oldestRulesVersion;
  if (!KEBAB_ID.test(id)) throw new Error(`Expansion id "${id}" is not kebab-case.`);
  if (!valid) throw new Error(`Expansion ${id}: 1 ≤ oldestRulesVersion ≤ rulesVersion.`);
}

const unknown = () => new RuleError('This expansion does not exist.', 'UNKNOWN_EXPANSION');

function playable(manifest: ExpansionManifest | undefined, version?: number) {
  if (!manifest) throw unknown();
  if (version === undefined) return manifest.rulesVersion;
  if (version < manifest.oldestRulesVersion || version > manifest.rulesVersion)
    throw new RuleError('These expansion rules are no longer played.', 'EXPANSION_VERSION', {
      version,
    });
  return version;
}

function readVersion(version: unknown): number | undefined {
  if (version === null || version === undefined) return undefined;
  if (!Number.isInteger(version))
    throw new RuleError('Invalid expansion rules version.', 'INVALID_INPUT');
  return version as number;
}

/** Checks the manifests (ids unique, versions consistent) and indexes them by id. */
export function createExpansionRegistry<Hooks>(
  list: readonly Expansion<Hooks>[],
): ExpansionRegistry<Hooks> {
  list.forEach((expansion) => checkManifest(expansion.manifest));
  const byId = new Map(list.map((expansion) => [expansion.manifest.id, expansion]));
  if (byId.size !== list.length) throw new Error('Two expansions share an id.');
  const isId = (value: unknown): value is string => typeof value === 'string' && byId.has(value);
  const playableVersion = (id: string, version?: number) =>
    playable(byId.get(id)?.manifest, version);
  return {
    list,
    ids: [...byId.keys()],
    get: (id) => byId.get(id),
    isId,
    playableVersion,
    read(id, version) {
      if (id === null || id === undefined) return null;
      if (!isId(id)) throw unknown();
      return { id, rulesVersion: playableVersion(id, readVersion(version)) };
    },
  };
}
