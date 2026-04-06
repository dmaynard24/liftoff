#!/usr/bin/env node

/**
 * Capture visual reference screenshots of a website using Playwright.
 *
 * Usage:
 *   node capture-screenshots.mjs <url> <output-dir>
 *
 * Example:
 *   node capture-screenshots.mjs https://example.com ideas/idea3
 *
 * Requires: npx playwright install chromium (first run only)
 */

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';

const [url, outputDir] = process.argv.slice(2);

if (!url || !outputDir) {
  console.error('Usage: node capture-screenshots.mjs <url> <output-dir>');
  process.exit(1);
}

const baseUrl = url.replace(/\/$/, '');
const outPath = resolve(outputDir, 'screenshots');

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  // { name: 'tablet', width: 768, height: 1024 },
  // { name: 'mobile', width: 480, height: 896 },
];

async function discoverSubpages(page) {
  const links = await page.$$eval('a[href]', (anchors, base) => {
    const seen = new Set();
    return anchors
      .map((a) => {
        try {
          return new URL(a.href, base).href;
        } catch {
          return null;
        }
      })
      .filter((href) => {
        if (!href || seen.has(href)) return false;
        seen.add(href);
        return href.startsWith(base) && href !== base && href !== base + '/';
      });
  }, baseUrl);

  // Deduplicate by pathname
  const unique = new Map();
  for (const link of links) {
    const { pathname } = new URL(link);
    if (!unique.has(pathname)) {
      unique.set(pathname, link);
    }
  }
  return [...unique.entries()].slice(0, 10); // cap at 10 subpages
}

function slugify(pathname) {
  const cleaned = pathname.replace(/^\/|\/$/g, '').replace(/\//g, '-');
  return cleaned || 'homepage';
}

async function captureFullPage(page, url, name) {
  console.log(`  Navigating to ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

  // Let lazy-loaded content and animations settle
  await page.waitForTimeout(1500);

  // Scroll to bottom to trigger any lazy-loaded content, then back to top
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await delay(200);
    }
    window.scrollTo(0, 0);
    await delay(500);
  });

  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(500);

    const filename = vp.name === 'desktop'
      ? `ref-${name}.png`
      : `ref-${name}-${vp.name}.png`;

    const filepath = resolve(outPath, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`  ✓ ${filename}`);
  }
}

async function main() {
  await mkdir(outPath, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    // Reasonable default UA
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  // 1. Capture homepage
  console.log('\n📸 Capturing homepage...');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Discover subpages before we start resizing
  const subpages = await discoverSubpages(page);

  // Now capture homepage at all viewports
  await captureFullPage(page, baseUrl, 'homepage');

  // 2. Capture subpages
  for (const [pathname, href] of subpages) {
    const name = slugify(pathname);
    console.log(`\n📸 Capturing /${pathname.replace(/^\//, '')}...`);
    await captureFullPage(page, href, name);
  }

  await browser.close();

  console.log(`\n✅ All screenshots saved to ${outPath}/`);
  console.log(`   ${(subpages.length + 1) * viewports.length} total screenshots captured.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
