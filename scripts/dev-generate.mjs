#!/usr/bin/env node
/**
 * dev-generate.mjs
 *
 * Reads a cached ExtractedPage JSON (created by capture-dev-data.mjs) and
 * runs generateStyleguide() to produce HTML — no browser needed.
 *
 * Usage:
 *   node scripts/dev-generate.mjs stripe.com
 *   open dev-data/stripe.com-styleguide.html
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const hostname = process.argv[2];
if (!hostname) {
  console.error('Usage: node scripts/dev-generate.mjs <hostname>');
  console.error('Example: node scripts/dev-generate.mjs stripe.com');
  process.exit(1);
}

const jsonPath = join(repoRoot, 'dev-data', `${hostname}.json`);

let page;
try {
  const raw = await readFile(jsonPath, 'utf-8');
  page = JSON.parse(raw);
} catch {
  console.error(`No cached data found at dev-data/${hostname}.json`);
  console.error(`Run first: node scripts/capture-dev-data.mjs https://${hostname}`);
  process.exit(1);
}

// Import the extractor modules
const { extractAllTokens } = await import('../apps/api/src/extractor/tokens.js');
const { extractComponentNames } = await import('../apps/api/src/extractor/components.js');
const { generateStyleguide } = await import('../apps/api/src/extractor/generator.js');

const sourceUrl = `https://${hostname}`;

console.log(`Generating styleguide for ${hostname} ...`);

const tokens = extractAllTokens(page.html);
const components = extractComponentNames(page.html);
const html = generateStyleguide(sourceUrl, tokens, components, page);

const outPath = join(repoRoot, 'dev-data', `${hostname}-styleguide.html`);
await writeFile(outPath, html, 'utf-8');

const sizeKb = Math.round(html.length / 1024);
console.log(`Done — dev-data/${hostname}-styleguide.html (${sizeKb} KB)`);
console.log(`Open with: open dev-data/${hostname}-styleguide.html`);
