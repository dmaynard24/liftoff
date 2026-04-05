#!/usr/bin/env node
/**
 * capture-dev-data.mjs
 *
 * Runs Playwright once against a URL and saves the full ExtractedPage JSON
 * to dev-data/<hostname>.json so you can iterate on generator.ts without
 * re-running the browser.
 *
 * Usage:
 *   node scripts/capture-dev-data.mjs https://stripe.com
 */

import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const url = process.argv[2];
if (!url) {
  console.error('Usage: node scripts/capture-dev-data.mjs <url>');
  process.exit(1);
}

try {
  new URL(url);
} catch {
  console.error('Invalid URL:', url);
  process.exit(1);
}

const hostname = new URL(url).hostname;
const outDir = join(repoRoot, 'dev-data');
const outPath = join(outDir, `${hostname}.json`);

console.log(`Capturing ${url} ...`);
console.log('(This runs Playwright — expect 15–40s)');

// Import the compiled TypeScript via tsx/bun
const { fetchRenderedHTML } = await import('../apps/api/src/extractor/fetch.js').catch(async () => {
  // Fallback: use bun to run in-process
  const { createRequire } = await import('module');
  return createRequire(import.meta.url)('../apps/api/src/extractor/fetch.js');
});

const page = await fetchRenderedHTML(url);

await mkdir(outDir, { recursive: true });
await writeFile(outPath, JSON.stringify(page, null, 2), 'utf-8');

const sizeKb = Math.round(JSON.stringify(page).length / 1024);
console.log(`\nSaved to dev-data/${hostname}.json (${sizeKb} KB)`);
console.log(`  buttons:  ${page.components.buttons.length}`);
console.log(`  badges:   ${page.components.badges.length}`);
console.log(`  inputs:   ${page.components.inputs.length}`);
console.log(`  cards:    ${page.components.cards.length}`);
console.log(`  header:   ${page.components.header ? 'yes' : 'no'}`);
console.log(`  nav:      ${page.components.nav ? 'yes' : 'no'}`);
console.log(`  hero:     ${page.components.hero ? 'yes' : 'no'}`);
console.log(`  footer:   ${page.components.footer ? 'yes' : 'no'}`);
console.log(`\nNow run: node scripts/dev-generate.mjs ${hostname}`);
