#!/usr/bin/env node
/**
 * Scaffolds an expansion: `pnpm new:expansion wild-west "Wild West"`.
 *
 * Writes the rules folder (packages/game/src/expansions/<id>), its conformance test, the web
 * half (apps/web/src/game/expansions/<id>) with an English and French bundle, the shop item,
 * and the registry lines. The new expansion plays exactly like the base game until you give it
 * hooks; docs/making-an-expansion.md walks through the rest.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const KEBAB_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const DEFAULT_PRICE = 500;

const [id, name] = process.argv.slice(2);
if (!id || !KEBAB_ID.test(id) || !name) {
  console.error('Usage: pnpm new:expansion <kebab-id> "Display name"');
  process.exit(1);
}
const camel = id.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const constant = id.replace(/-/g, '_').toUpperCase();
const paths = {
  rules: `packages/game/src/expansions/${id}`,
  test: `packages/game/tests/expansions/${id}.test.ts`,
  web: `apps/web/src/game/expansions/${id}`,
};
if (existsSync(join(root, paths.rules))) {
  console.error(`An expansion "${id}" already exists.`);
  process.exit(1);
}

const written = [];
function write(path, content) {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), content);
  written.push(path);
}

/** Inserts `text` into a registry file, at the place `pattern`'s groups delimit. */
function edit(path, pattern, insert) {
  const source = readFileSync(join(root, path), 'utf8');
  if (!pattern.test(source)) throw new Error(`Cannot find where to register ${id} in ${path}.`);
  writeFileSync(join(root, path), source.replace(pattern, insert));
  written.push(path);
}

const rulesIndex = `import type { GameExpansion, Hooks } from '../../hooks';
import { ${constant}_ID, ${constant}_ITEM, ${constant}_RULES_VERSION } from './constants';

/**
 * Each hook replaces or extends one extension point of the base rules (see ../../hooks.ts):
 * extra cards, wild cards, effects when a card is played, turn order, penalties, the view
 * of the expansion's state, the bot's score. With none, the base game plays unchanged.
 */
const hooks: Hooks = {};

/** ${name}. Its rules are written down in RULES.md, next to this file. */
export const ${camel}: GameExpansion = {
  manifest: {
    id: ${constant}_ID,
    rulesVersion: ${constant}_RULES_VERSION,
    oldestRulesVersion: ${constant}_RULES_VERSION,
    item: ${constant}_ITEM,
  },
  hooks,
};
`;

const rulesConstants = `export const ${constant}_ID = '${id}';
/** Bump when a rule change would alter saved matches; raise oldestRulesVersion when old ones go. */
export const ${constant}_RULES_VERSION = 1;
/** The shop item that unlocks the expansion (\`@cardgame/meta\`). */
export const ${constant}_ITEM = 'expansion-${id}';
`;

const rulesDoc = `# ${name}: rules

> An expansion of [Crazy Eights](../../../RULES.md). Everything not written here plays as in the
> base game. Numbers live in \`constants.ts\`; each rule has a test in
> \`tests/expansions/${id}.test.ts\`. Rules version **1**.

## Components

## Setup

## New cards and effects

## Scoring

## Edge cases

| Situation | Ruling |
| --------- | ------ |
`;

const test = `import { describe, expect, it } from 'vitest';
import { checkConformance, createMatch } from '@cardgame/engine';
import { basicBot, game } from '../../src';

const OPTIONS = { expansion: '${id}' };
/** Conformance checks thousands of positions: more than vitest's default 5 s on a busy machine. */
const SLOW_MS = 60_000;
const withExpansion = { ...game, defaultOptions: game.parseOptions(OPTIONS) };

describe('${name}', () => {
  it('records the expansion and its rules version', () => {
    const match = createMatch(game, { players: 3, seed: 1, options: OPTIONS });
    expect(match.state.expansion).toEqual({ id: '${id}', rulesVersion: 1 });
  });

  it(
    'plays random and bot games by the contract',
    () => {
      expect(checkConformance(withExpansion).games).toBeGreaterThan(0);
      expect(checkConformance(withExpansion, { bot: basicBot }).moves).toBeGreaterThan(0);
    },
    SLOW_MS,
  );
});
`;

const webBundle = `import { defineBundle } from '@cardgame/i18n';

/** Everything ${name} says: its name, its cards, its log sentences and its rules. */
export const ${camel} = defineBundle({
  en: {
    name: ${JSON.stringify(name)},
    tagline: 'TODO: one line on what the expansion changes.',
    rules: {
      overview: { title: 'What changes', body: 'TODO: the rules, as in RULES.md.' },
    },
  },
  fr: {
    name: ${JSON.stringify(name)},
    tagline: 'TODO : une ligne sur ce que change l’extension.',
    rules: {
      overview: { title: 'Ce qui change', body: 'TODO : les règles, comme dans RULES.md.' },
    },
  },
});
`;

const webUi = `import { messages } from '../../../i18n/messages';
import type { ExpansionUi } from '../types';

/** The web half of ${name}: add \`cards\` faces, \`describe\` for its log events, a \`Status\`. */
export const ${camel}Ui: ExpansionUi = {
  id: '${id}',
  name: (t) => t('${camel}.name'),
  tagline: (t) => t('${camel}.tagline'),
  cards: {},
  rules: (locale) => messages[locale].${camel}.rules,
};
`;

function scaffold() {
  write(`${paths.rules}/index.ts`, rulesIndex);
  write(`${paths.rules}/constants.ts`, rulesConstants);
  write(`${paths.rules}/RULES.md`, rulesDoc);
  write(paths.test, test);
  write(`${paths.web}/i18n.ts`, webBundle);
  write(`${paths.web}/index.ts`, webUi);
}

/** The first block of import lines of a file, to append an import to. */
const IMPORTS = /^((?:import .*\n)+)/m;

function register() {
  const gameRegistry = 'packages/game/src/expansions/index.ts';
  edit(gameRegistry, IMPORTS, `$1import { ${camel} } from './${id}';\n`);
  edit(gameRegistry, /(createExpansionRegistry<Hooks>\(\[[^\]]*)\]/, `$1, ${camel}]`);
  const webRegistry = 'apps/web/src/game/expansions/index.ts';
  edit(webRegistry, IMPORTS, `$1import { ${camel}Ui } from './${id}';\n`);
  edit(webRegistry, /(EXPANSION_UIS: readonly ExpansionUi\[\] = \[[^\]]*)\]/, `$1, ${camel}Ui]`);
  const messages = 'apps/web/src/i18n/messages.ts';
  edit(messages, IMPORTS, `$1import { ${camel} } from '../game/expansions/${id}/i18n';\n`);
  edit(messages, /(const bundles = \{[\s\S]*?)(\n\};)/, `$1\n  ${camel},$2`);
  const item = `{ id: 'expansion-${id}', kind: 'expansion', rarity: 'rare', price: ${DEFAULT_PRICE} },`;
  edit(
    'packages/meta/src/items.ts',
    /(export const ITEMS: readonly Item\[\] = \[[\s\S]*?)(\n\];)/,
    `$1\n  ${item}$2`,
  );
}

scaffold();
register();
execFileSync('pnpm', ['exec', 'prettier', '--write', ...new Set(written)], {
  cwd: root,
  stdio: 'ignore',
});
console.log(
  `Expansion "${id}" scaffolded:\n${[...new Set(written)].map((p) => `  ${p}`).join('\n')}`,
);
console.log(
  'Next: write RULES.md, add hooks and tests, translate the bundle. See docs/making-an-expansion.md.',
);
