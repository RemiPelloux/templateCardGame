#!/usr/bin/env node
/**
 * Draws the installable app's icons from apps/web/public/favicon.svg: `pnpm icons`. Run it after
 * changing the favicon and commit the PNGs; the build only copies them.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const PUBLIC = resolve(import.meta.dirname, '../apps/web/public');
const SOURCE = resolve(PUBLIC, 'favicon.svg');
const OUT = resolve(PUBLIC, 'icons');
/** The manifest's background colour (`--canvas`), behind maskable and Apple icons. */
const BACKGROUND = '#f4f1ea';
/** Rasterise the SVG large, then shrink: small sizes stay crisp. */
const DENSITY = 1_200;
/** Maskable icons keep their drawing inside the central 80 % safe zone. */
const MASKABLE_SAFE = 0.8;
/** Apple rounds the corners itself and wants an opaque square with a little margin. */
const APPLE_SAFE = 0.86;

const ICONS = [
  { file: 'icon-192.png', size: 192, scale: 1, opaque: false },
  { file: 'icon-512.png', size: 512, scale: 1, opaque: false },
  { file: 'maskable-512.png', size: 512, scale: MASKABLE_SAFE, opaque: true },
  { file: 'apple-touch-icon.png', size: 180, scale: APPLE_SAFE, opaque: true },
];

async function draw({ file, size, scale, opaque }) {
  const inner = Math.round(size * scale);
  const art = await sharp(SOURCE, { density: DENSITY }).resize(inner, inner).png().toBuffer();
  const canvas = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: opaque ? BACKGROUND : { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  const offset = Math.round((size - inner) / 2);
  await canvas
    .composite([{ input: art, top: offset, left: offset }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT, file));
  console.log(`icons/${file} ${size}×${size}`);
}

mkdirSync(OUT, { recursive: true });
for (const icon of ICONS) await draw(icon);
