#!/usr/bin/env node
/**
 * Keeps the layers honest. Each folder may only import what the architecture allows:
 *
 *   engine   → nothing (pure kernel)
 *   game     → engine
 *   protocol → engine, game
 *   server   → engine, game, protocol, Node
 *   web      → engine, game, protocol, React (never the server, never Node)
 *
 * Run by `pnpm lint:boundaries` and in CI. Exits 1 and lists every violation.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const IMPORT =
  /(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const RULES = [
  { dir: 'packages/engine/src', allow: [] },
  { dir: 'packages/game/src', allow: ['@cardgame/engine'] },
  { dir: 'packages/protocol/src', allow: ['@cardgame/engine', '@cardgame/game'] },
  {
    dir: 'apps/server/src',
    allow: [
      '@cardgame/engine',
      '@cardgame/game',
      '@cardgame/protocol',
      'node:',
      'better-sqlite3',
      'sirv',
      'vite',
    ],
  },
  {
    dir: 'apps/web/src',
    allow: ['@cardgame/engine', '@cardgame/game', '@cardgame/protocol', 'react', 'react-dom'],
  },
];

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(ts|tsx|mts)$/.test(name)) yield path;
  }
}

const allowed = (specifier, allow) =>
  specifier.startsWith('.') ||
  allow.some(
    (prefix) =>
      specifier === prefix || specifier.startsWith(prefix.endsWith(':') ? prefix : `${prefix}/`),
  );

const violations = RULES.flatMap(({ dir, allow }) =>
  [...files(join(root, dir))].flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(IMPORT)]
      .map((match) => match[1] ?? match[2])
      .filter((specifier) => !allowed(specifier, allow))
      .map((specifier) => `${relative(root, file)} imports "${specifier}"`),
  ),
);

if (violations.length) {
  console.error(
    `Layer boundaries broken (see docs/architecture.md):\n  ${violations.join('\n  ')}`,
  );
  process.exit(1);
}
console.log('Layer boundaries respected.');
