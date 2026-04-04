import { chromium } from 'playwright';

export interface ComputedElement {
  tag: string;
  text: string;
  outerHTML: string;
  styles: Record<string, string>;
}

export interface ExtractedPage {
  html: string;
  styleBlocks: string;
  googleFontsLinks: string[];
  components: {
    buttons: ComputedElement[];
    inputs: ComputedElement[];
    textareas: ComputedElement[];
    links: ComputedElement[];
    badges: ComputedElement[];
    cards: ComputedElement[];
    header: ComputedElement | null;
    nav: ComputedElement | null;
    footer: ComputedElement | null;
    hero: ComputedElement | null;
  };
}

const STYLE_KEYS = [
  'backgroundColor', 'color', 'borderRadius', 'padding',
  'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
  'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing',
  'border', 'borderColor', 'borderWidth', 'boxShadow',
  'display', 'gap', 'alignItems', 'justifyContent', 'flexDirection',
  'gridTemplateColumns', 'maxWidth', 'width', 'height', 'margin',
];

export async function fetchRenderedHTML(url: string): Promise<ExtractedPage> {
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const html = await page.content();

    // Run all extraction in a single page.evaluate() call
    const extracted = await page.evaluate((styleKeys: string[]) => {
      function getStyles(el: Element): Record<string, string> {
        const cs = window.getComputedStyle(el);
        const out: Record<string, string> = {};
        for (const k of styleKeys) {
          out[k] = cs.getPropertyValue(
            k.replace(/([A-Z])/g, '-$1').toLowerCase(),
          ) ?? '';
        }
        return out;
      }

      function toElement(el: Element): {
        tag: string; text: string; outerHTML: string; styles: Record<string, string>;
      } {
        return {
          tag: el.tagName.toLowerCase(),
          text: (el as HTMLElement).innerText?.slice(0, 100) ?? '',
          outerHTML: el.outerHTML.slice(0, 3000),
          styles: getStyles(el),
        };
      }

      function queryMany(selectors: string, limit: number) {
        try {
          return Array.from(document.querySelectorAll(selectors))
            .filter((el) => {
              // Skip hidden elements
              const cs = window.getComputedStyle(el);
              return cs.display !== 'none' && cs.visibility !== 'hidden';
            })
            .slice(0, limit)
            .map(toElement);
        } catch {
          return [];
        }
      }

      function queryOne(selectors: string): ReturnType<typeof toElement> | null {
        try {
          const el = document.querySelector(selectors);
          return el ? toElement(el) : null;
        } catch {
          return null;
        }
      }

      // Deduplicate buttons by background color to get distinct variants
      const allButtons = queryMany(
        'button:not([disabled]):not([aria-hidden="true"]), a[class*="btn"], [class*="button"]:not(body):not(html), [role="button"]',
        20,
      );
      const seenBg = new Set<string>();
      const buttons = allButtons.filter((b) => {
        const bg = b.styles.backgroundColor;
        if (seenBg.has(bg)) return false;
        seenBg.add(bg);
        return true;
      }).slice(0, 5);

      const styleBlocks = Array.from(document.querySelectorAll('style'))
        .map((s) => s.textContent ?? '')
        .join('\n');

      const googleFontsLinks = Array.from(
        document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]'),
      ).map((l) => (l as HTMLLinkElement).href);

      return {
        styleBlocks,
        googleFontsLinks,
        components: {
          buttons,
          inputs: queryMany(
            'input[type="text"], input[type="email"], input[type="search"], input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])',
            3,
          ),
          textareas: queryMany('textarea', 2),
          links: queryMany('nav a, header a', 5),
          badges: queryMany(
            '[class*="badge"], [class*="tag"], [class*="chip"], [class*="label"], [class*="pill"]',
            5,
          ),
          cards: queryMany('[class*="card"], article, [class*="tile"]', 4),
          header: queryOne('header, [class*="header"]:not([class*="subheader"]):not([class*="section-header"]), [role="banner"]'),
          nav: queryOne('nav, [role="navigation"]'),
          footer: queryOne('footer, [class*="footer"], [role="contentinfo"]'),
          hero: queryOne('[class*="hero"], .hero, #hero, main > section:first-child'),
        },
      };
    }, STYLE_KEYS);

    return {
      html,
      styleBlocks: extracted.styleBlocks,
      googleFontsLinks: extracted.googleFontsLinks,
      components: extracted.components,
    };
  } finally {
    await browser.close();
  }
}
