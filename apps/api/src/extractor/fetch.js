import { chromium } from 'playwright';
const STYLE_KEYS = [
    'backgroundColor', 'color', 'borderRadius', 'padding',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing',
    'border', 'borderColor', 'borderWidth', 'boxShadow',
    'display', 'gap', 'alignItems', 'justifyContent', 'flexDirection',
    'gridTemplateColumns', 'maxWidth', 'width', 'height', 'margin',
];
export async function fetchRenderedHTML(url) {
    const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        });
        const page = await context.newPage();
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(1500);
        // Scroll through the page to trigger IntersectionObserver lazy-loading
        await page.evaluate(async () => {
            const step = 600;
            const total = document.body.scrollHeight;
            for (let pos = 0; pos < total; pos += step) {
                window.scrollTo(0, pos);
                await new Promise((r) => setTimeout(r, 120));
            }
            window.scrollTo(0, 0);
        });
        await page.waitForTimeout(500);
        const html = await page.content();
        // Run all extraction in a single page.evaluate() call
        const extracted = await page.evaluate((styleKeys) => {
            // ── Visual properties for deep serialization ──────────────────────────
            const VISUAL_PROPS = [
                'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
                'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
                'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                'box-sizing',
                'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
                'border-radius', 'border-top-left-radius', 'border-top-right-radius',
                'border-bottom-left-radius', 'border-bottom-right-radius',
                'outline', 'box-shadow',
                'background-color', 'background-image', 'background-size',
                'background-position', 'background-repeat', 'background-attachment',
                'color', 'font-family', 'font-size', 'font-weight', 'font-style',
                'line-height', 'letter-spacing', 'text-align', 'text-decoration',
                'text-transform', 'white-space', 'overflow', 'overflow-x', 'overflow-y',
                'text-overflow', 'word-break', 'vertical-align',
                'flex', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis',
                'justify-content', 'align-items', 'align-self', 'align-content', 'gap',
                'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
                'column-gap', 'row-gap',
                'opacity', 'transform', 'filter', 'visibility', 'cursor', 'pointer-events',
                'aspect-ratio', 'object-fit', 'object-position',
                'float', 'clear', 'clip-path',
                'stroke', 'fill', 'stroke-width',
            ];
            // ── Deep style serialization ─────────────────────────────────────────
            function serializeWithStyles(root) {
                const clone = root.cloneNode(true);
                function walk(orig, cloned) {
                    try {
                        const cs = window.getComputedStyle(orig);
                        const parts = [];
                        for (const p of VISUAL_PROPS) {
                            const v = cs.getPropertyValue(p);
                            if (v && v !== '' && v !== 'none' && v !== 'auto' && v !== 'normal' && v !== '0px') {
                                parts.push(`${p}:${v}`);
                            }
                        }
                        // Always include display — even if 'block' — so the clone renders correctly
                        const display = cs.getPropertyValue('display');
                        if (display && !parts.some((s) => s.startsWith('display:'))) {
                            parts.push(`display:${display}`);
                        }
                        // Always set box-sizing
                        if (!parts.some((s) => s.startsWith('box-sizing:'))) {
                            parts.push('box-sizing:border-box');
                        }
                        if (parts.length)
                            cloned.setAttribute('style', parts.join(';'));
                    }
                    catch { /* skip unparseable elements */ }
                    const origKids = Array.from(orig.children);
                    const cloneKids = Array.from(cloned.children);
                    for (let i = 0; i < origKids.length && i < cloneKids.length; i++) {
                        walk(origKids[i], cloneKids[i]);
                    }
                }
                walk(root, clone);
                return clone.outerHTML;
            }
            // ── Style snapshot (shallow, for atom rendering) ─────────────────────
            function getStyles(el) {
                const cs = window.getComputedStyle(el);
                const out = {};
                for (const k of styleKeys) {
                    out[k] = cs.getPropertyValue(k.replace(/([A-Z])/g, '-$1').toLowerCase()) ?? '';
                }
                return out;
            }
            // ── Element serializer ───────────────────────────────────────────────
            function toElement(el, deepSerialize = false) {
                return {
                    tag: el.tagName.toLowerCase(),
                    text: el.innerText?.slice(0, 100) ?? '',
                    outerHTML: el.outerHTML.slice(0, 3000),
                    selfContainedHtml: deepSerialize ? serializeWithStyles(el) : el.outerHTML.slice(0, 3000),
                    styles: getStyles(el),
                };
            }
            // ── Filter to outermost elements only (avoid sub-elements) ───────────
            function filterTopLevel(els) {
                return els.filter((el) => !els.some((other) => other !== el && other.contains(el)));
            }
            // ── isVisible: skip hidden/tiny elements ─────────────────────────────
            function isVisible(el) {
                const cs = window.getComputedStyle(el);
                if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0')
                    return false;
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
            }
            function queryMany(selectors, limit, deep = false, minSize = 0) {
                try {
                    let els = Array.from(document.querySelectorAll(selectors)).filter(isVisible);
                    if (minSize > 0) {
                        els = els.filter((el) => {
                            const r = el.getBoundingClientRect();
                            return r.width >= minSize && r.height >= minSize;
                        });
                    }
                    els = filterTopLevel(els);
                    return els.slice(0, limit).map((el) => toElement(el, deep));
                }
                catch {
                    return [];
                }
            }
            function queryOne(selectors, deep = false) {
                try {
                    const el = document.querySelector(selectors);
                    if (!el || !isVisible(el))
                        return null;
                    return toElement(el, deep);
                }
                catch {
                    return null;
                }
            }
            // ── Buttons: deduplicate by bg color, keep distinct variants ─────────
            const allButtons = queryMany('button:not([disabled]):not([aria-hidden="true"]), a[class*="btn"], [class*="button"]:not(body):not(html), [role="button"]', 20, false);
            const seenBg = new Set();
            const buttons = allButtons.filter((b) => {
                const bg = b.styles.backgroundColor;
                if (seenBg.has(bg))
                    return false;
                seenBg.add(bg);
                return true;
            }).slice(0, 5);
            const styleBlocks = Array.from(document.querySelectorAll('style'))
                .map((s) => s.textContent ?? '')
                .join('\n');
            const googleFontsLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]')).map((l) => l.href);
            // ── Type scale: sample real headings and text elements ───────────────
            const TYPE_SELECTORS = [
                ['h1', 'h1'], ['h2', 'h2'], ['h3', 'h3'],
                ['h4', 'h4'], ['h5', 'h5'], ['h6', 'h6'],
                ['p', 'p'], ['a', 'a'], ['li', 'li'],
                ['small', 'small'], ['label', 'label'], ['caption', 'caption'],
            ];
            const seenSizes = new Set();
            const typeScale = [];
            for (const [sel, role] of TYPE_SELECTORS) {
                try {
                    const els = Array.from(document.querySelectorAll(sel)).filter((el) => {
                        const cs = window.getComputedStyle(el);
                        return cs.display !== 'none' && cs.visibility !== 'hidden';
                    });
                    for (const el of els) {
                        const cs = window.getComputedStyle(el);
                        const fontSize = cs.getPropertyValue('font-size');
                        if (!fontSize || seenSizes.has(fontSize))
                            continue;
                        const text = el.innerText?.trim().slice(0, 80) ?? '';
                        if (!text)
                            continue;
                        seenSizes.add(fontSize);
                        typeScale.push({
                            fontSize,
                            fontWeight: cs.getPropertyValue('font-weight'),
                            lineHeight: cs.getPropertyValue('line-height'),
                            letterSpacing: cs.getPropertyValue('letter-spacing'),
                            fontFamily: cs.getPropertyValue('font-family'),
                            sampleText: text,
                            role,
                        });
                        // continue — capture all unique sizes for this selector
                    }
                }
                catch { /* skip */ }
            }
            // Sort by font-size descending (largest first)
            typeScale.sort((a, b) => parseFloat(b.fontSize) - parseFloat(a.fontSize));
            // ── Spacing scale: sample padding/gap/margin from visible elements ───
            const SPACING_PROPS = [
                ['padding-top', 'padding'], ['padding-right', 'padding'],
                ['padding-bottom', 'padding'], ['padding-left', 'padding'],
                ['gap', 'gap'], ['row-gap', 'gap'], ['column-gap', 'gap'],
                ['margin-top', 'margin'], ['margin-bottom', 'margin'],
            ];
            const spacingMap = new Map(); // px → sources
            const SAMPLE_SELECTORS = [
                'button', 'a', 'nav', 'header', 'section', 'article',
                'main', 'footer', 'li', 'p', '[class*="card"]',
                '[class*="btn"]', '[class*="container"]', '[class*="wrapper"]',
            ];
            for (const sel of SAMPLE_SELECTORS) {
                try {
                    const els = Array.from(document.querySelectorAll(sel)).slice(0, 6);
                    for (const el of els) {
                        const cs = window.getComputedStyle(el);
                        for (const [prop, source] of SPACING_PROPS) {
                            const val = cs.getPropertyValue(prop);
                            const px = parseFloat(val);
                            if (!isNaN(px) && px > 0 && px <= 320) {
                                const rounded = Math.round(px);
                                if (rounded > 0) {
                                    const existing = spacingMap.get(rounded) ?? new Set();
                                    existing.add(source);
                                    spacingMap.set(rounded, existing);
                                }
                            }
                        }
                    }
                }
                catch { /* skip */ }
            }
            const BASE_FONT_SIZE = parseFloat(window.getComputedStyle(document.documentElement).fontSize) || 16;
            const spacingScale = [...spacingMap.entries()]
                .sort(([a], [b]) => a - b)
                .filter(([px]) => px >= 2) // skip sub-2px (borders etc.)
                .map(([px, sources]) => {
                const remVal = px / BASE_FONT_SIZE;
                const isCleanRem = Math.abs(remVal - Math.round(remVal * 4) / 4) < 0.01;
                const rem = isCleanRem
                    ? `${Math.round(remVal * 4) / 4}rem`
                    : `${px}px`;
                return { px, rem, sources: [...sources] };
            });
            // ── Radius scale ──────────────────────────────────────────────────────
            const RADIUS_SELECTORS = [
                'button', 'input', 'a', '[class*="btn"]', '[class*="card"]',
                '[class*="badge"]', '[class*="tag"]', '[class*="chip"]',
                '[class*="pill"]', '[class*="modal"]', '[class*="tooltip"]',
                'img', 'nav', 'header', 'section', 'article',
            ];
            const seenRadius = new Set();
            const radiusEntries = [];
            for (const sel of RADIUS_SELECTORS) {
                try {
                    const els = Array.from(document.querySelectorAll(sel)).slice(0, 8);
                    for (const el of els) {
                        const cs = window.getComputedStyle(el);
                        const val = cs.getPropertyValue('border-radius').trim();
                        if (!val || val === '0px' || seenRadius.has(val))
                            continue;
                        seenRadius.add(val);
                        const px = val.endsWith('%') ? 9999 : parseFloat(val);
                        if (!isNaN(px))
                            radiusEntries.push({ value: val, px });
                    }
                }
                catch { /* skip */ }
            }
            radiusEntries.sort((a, b) => a.px - b.px);
            // ── Shadow scale ──────────────────────────────────────────────────────
            const SHADOW_SELECTORS = [
                '[class*="card"]', '[class*="modal"]', '[class*="dropdown"]',
                '[class*="popover"]', '[class*="tooltip"]', '[class*="shadow"]',
                'button', 'nav', 'header', 'aside', 'dialog',
            ];
            const seenShadow = new Set();
            const shadowEntries = [];
            for (const sel of SHADOW_SELECTORS) {
                try {
                    const els = Array.from(document.querySelectorAll(sel)).slice(0, 6);
                    for (const el of els) {
                        const cs = window.getComputedStyle(el);
                        const val = cs.getPropertyValue('box-shadow').trim();
                        if (!val || val === 'none' || seenShadow.has(val))
                            continue;
                        seenShadow.add(val);
                        shadowEntries.push({ value: val });
                    }
                }
                catch { /* skip */ }
            }
            // ── Motion scale ──────────────────────────────────────────────────────
            const MOTION_SELECTORS = [
                'button', 'a', '[class*="btn"]', '[class*="link"]',
                '[class*="nav"]', '[class*="card"]', '[class*="input"]',
                'input', 'li', '[class*="toggle"]', '[class*="tab"]',
            ];
            const seenTransition = new Set();
            const motionEntries = [];
            for (const sel of MOTION_SELECTORS) {
                try {
                    const els = Array.from(document.querySelectorAll(sel)).slice(0, 10);
                    for (const el of els) {
                        const cs = window.getComputedStyle(el);
                        const raw = cs.getPropertyValue('transition').trim();
                        if (!raw || raw === 'none' || raw === 'all 0s ease 0s')
                            continue;
                        // Paren-aware split: split only on commas outside parentheses
                        // so cubic-bezier(0.25, 0, 0.5, 1) is never clipped
                        const splitParts = [];
                        let parenDepth = 0, partStart = 0;
                        for (let j = 0; j < raw.length; j++) {
                            if (raw[j] === '(')
                                parenDepth++;
                            else if (raw[j] === ')')
                                parenDepth--;
                            else if (raw[j] === ',' && parenDepth === 0) {
                                splitParts.push(raw.slice(partStart, j).trim());
                                partStart = j + 1;
                            }
                        }
                        if (partStart < raw.length)
                            splitParts.push(raw.slice(partStart).trim());
                        for (const part of splitParts.filter(Boolean)) {
                            if (seenTransition.has(part))
                                continue;
                            seenTransition.add(part);
                            // Extract components: property duration easing delay
                            const tokens2 = part.split(/\s+/);
                            const property = tokens2[0] ?? 'all';
                            const duration = tokens2.find((t) => /^\d+(\.\d+)?m?s$/.test(t)) ?? '0s';
                            // Use regex to preserve cubic-bezier(...) / steps(...) intact
                            const easingFnMatch = part.match(/cubic-bezier\([^)]*\)|steps\([^)]*\)/);
                            const easing = easingFnMatch
                                ? easingFnMatch[0]
                                : (tokens2.find((t) => ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear'].includes(t)) ?? 'ease');
                            if (duration === '0s' || parseFloat(duration) === 0)
                                continue;
                            motionEntries.push({ duration, easing, property, rawTransition: part });
                        }
                    }
                }
                catch { /* skip */ }
            }
            // ── Border scale ──────────────────────────────────────────────────────
            const BORDER_SELECTORS = [
                'button', 'input', 'a', '[class*="card"]', '[class*="input"]',
                '[class*="btn"]', '[class*="badge"]', '[class*="tag"]',
                'nav', 'header', 'hr', '[class*="divider"]', '[class*="border"]',
                'section', 'article', 'li',
            ];
            const seenBorder = new Set();
            const borderEntries = [];
            for (const sel of BORDER_SELECTORS) {
                try {
                    const els = Array.from(document.querySelectorAll(sel)).slice(0, 8);
                    for (const el of els) {
                        const cs = window.getComputedStyle(el);
                        // Check all four sides, keep unique combos
                        for (const side of ['top', 'right', 'bottom', 'left']) {
                            const width = cs.getPropertyValue(`border-${side}-width`).trim();
                            const color = cs.getPropertyValue(`border-${side}-color`).trim();
                            const bstyle = cs.getPropertyValue(`border-${side}-style`).trim();
                            if (!width || width === '0px' || bstyle === 'none')
                                continue;
                            const key = `${width}|${color}|${bstyle}`;
                            if (seenBorder.has(key))
                                continue;
                            seenBorder.add(key);
                            borderEntries.push({ width, color, style: bstyle });
                        }
                    }
                }
                catch { /* skip */ }
            }
            return {
                styleBlocks,
                googleFontsLinks,
                typeScale,
                spacingScale,
                radiusScale: radiusEntries,
                shadowScale: shadowEntries,
                motionScale: motionEntries,
                borderScale: borderEntries,
                components: {
                    buttons,
                    inputs: queryMany('input[type="text"], input[type="email"], input[type="search"], input:not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])', 3),
                    textareas: queryMany('textarea', 2),
                    links: queryMany('nav a, header a', 5),
                    badges: queryMany('[class*="badge"], [class*="tag"], [class*="chip"], [class*="label"], [class*="pill"]', 5, false, 20),
                    cards: queryMany('[class*="card"]:not([class*="card-body"]):not([class*="card-footer"]):not([class*="card-header"]):not([class*="card-title"]):not([class*="card-text"]), article:not(main article article), [class*="tile"]', 4, true, // deep serialize cards
                    80),
                    header: queryOne('header, [class*="header"]:not([class*="subheader"]):not([class*="section-header"]), [role="banner"]', true),
                    nav: queryOne('nav, [role="navigation"]', true),
                    footer: queryOne('footer, [class*="footer"]:not([class*="card-footer"]):not([class*="section-footer"]), [role="contentinfo"]', true),
                    hero: queryOne('[class*="hero"], .hero, #hero, main > section:first-child', true),
                },
            };
        }, STYLE_KEYS);
        return {
            html,
            styleBlocks: extracted.styleBlocks,
            googleFontsLinks: extracted.googleFontsLinks,
            typeScale: extracted.typeScale,
            spacingScale: extracted.spacingScale,
            radiusScale: extracted.radiusScale,
            shadowScale: extracted.shadowScale,
            motionScale: extracted.motionScale,
            borderScale: extracted.borderScale,
            components: extracted.components,
        };
    }
    finally {
        await browser.close();
    }
}
