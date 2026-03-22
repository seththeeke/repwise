#!/usr/bin/env node
/**
 * Generates a 1024x1024 app icon: purple background + "Repwise" in cursive.
 * Run: node scripts/generate-app-icon.mjs
 */
import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SIZE = 1024;
const PURPLE = '#7c3aed'; // --color-primary

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <rect width="100%" height="100%" fill="${PURPLE}"/>
  <text
    x="50%"
    y="50%"
    dominant-baseline="central"
    text-anchor="middle"
    font-family="Georgia, 'Apple Chancery', 'Brush Script MT', cursive"
    font-size="180"
    font-style="italic"
    fill="white"
  >Repwise</text>
</svg>
`;

const buffer = Buffer.from(svg);
const outPath = join(
  __dirname,
  '../ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
);

await sharp(buffer)
  .resize(SIZE, SIZE)
  .png()
  .toFile(outPath);

console.log('App icon generated:', outPath);
