#!/usr/bin/env node
/**
 * Turns the template into your project: `pnpm rename "Moon Poker" moon-poker`.
 * Replaces the display name, the root package name, the `@cardgame/` scope and the Docker image
 * name in every tracked text file, then asks you to reinstall. Run it once, on a clean tree.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [title, slug] = process.argv.slice(2);
if (!title || !slug || !/^[a-z][a-z0-9-]*$/.test(slug)) {
  console.error('Usage: pnpm rename "Display Name" kebab-case-slug');
  process.exit(1);
}
const dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
if (dirty) {
  console.error('Commit or stash your changes first: the rename touches many files.');
  process.exit(1);
}

const REPLACEMENTS = [
  ['Card Game Template', title],
  ['card-game-template', slug],
  ['@cardgame/', `@${slug}/`],
];
const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .filter((file) => file && file !== 'pnpm-lock.yaml' && !/\.(png|webp|woff2?|ico)$/.test(file));

let changed = 0;
for (const file of files) {
  const before = readFileSync(file, 'utf8');
  const after = REPLACEMENTS.reduce((text, [from, to]) => text.replaceAll(from, to), before);
  if (after !== before) {
    writeFileSync(file, after);
    changed++;
  }
}
console.log(
  `Renamed to “${title}” (${slug}) in ${changed} files. Now run: pnpm install && pnpm verify`,
);
