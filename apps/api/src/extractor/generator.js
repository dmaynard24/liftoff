export function generateStyleguide(sourceUrl, tokens, components, page) {
    const { colors, typography, spacing, radius, shadows, animations, layout } = tokens;
    const hostname = new URL(sourceUrl).hostname;
    // Pick a primary accent from top chromatic color, fall back to a neutral
    const accentColor = colors.chromatic[0]?.value ?? '#7c6dfa';
    // ─── Google Fonts (for <head>) ────────────────────────────────────────────
    const uniqueFontUrls = [...new Set([
            ...(typography.googleFontsUrl ? [typography.googleFontsUrl] : []),
            ...page.googleFontsLinks,
        ])];
    const googleFontsLinks = uniqueFontUrls.length
        ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  ${uniqueFontUrls.map((u) => `<link rel="stylesheet" href="${u}">`).join('\n  ')}`
        : '';
    // ─── Helpers ───────────────────────────────────────────────────────────────
    const esc = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    function section(id, label, title, desc, body) {
        return `
  <section class="sg-section" id="${id}">
    <p class="sg-section-label">${label}</p>
    <h2 class="sg-section-title">${title}</h2>
    <p class="sg-section-desc">${desc}</p>
    ${body}
  </section>`;
    }
    function sub(title, body) {
        return `<div class="sg-sub"><h3 class="sg-sub-title">${title}</h3>${body}</div>`;
    }
    function card(body, footer) {
        return `<div class="sg-card"><div class="sg-card-body">${body}</div>${footer ? `<div class="sg-card-footer">${footer}</div>` : ''}</div>`;
    }
    function tokenList(items) {
        if (!items.length)
            return '<p class="sg-muted">None detected</p>';
        return `<ul class="sg-token-list">${items.map((i) => `<li><code>${esc(i)}</code></li>`).join('')}</ul>`;
    }
    // ─── Colors ────────────────────────────────────────────────────────────────
    const colorSwatch = ({ value, count }) => `
      <div class="color-swatch">
        <div class="color-swatch-preview" style="background:${value}"></div>
        <div class="color-swatch-info">
          <div class="color-swatch-name">${esc(value)}</div>
          <div class="color-swatch-count">${count}×</div>
        </div>
      </div>`;
    const colorsSection = section('colors', 'Foundations', 'Colors', "All color values extracted from the site's stylesheets, deduplicated and grouped by hue.", [
        colors.chromatic.length ? sub('Chromatic', `<div class="sg-grid-4">${colors.chromatic.map(colorSwatch).join('')}</div>`) : '',
        colors.grayscale.length ? sub('Grayscale', `<div class="sg-grid-4">${colors.grayscale.map(colorSwatch).join('')}</div>`) : '',
        colors.rgba.length ? sub('Opacity variants', `<div class="sg-grid-4">${colors.rgba.map(colorSwatch).join('')}</div>`) : '',
    ].join(''));
    // ─── Typography ────────────────────────────────────────────────────────────
    // Supplement regex-extracted tokens with computed styles from Playwright —
    // sites that load CSS externally (Stripe, etc.) have empty regex results.
    const allPageEls = [
        ...page.components.buttons,
        ...page.components.badges,
        ...page.components.inputs,
        ...page.components.links,
        page.components.header,
        page.components.nav,
        page.components.hero,
        page.components.footer,
    ].filter(Boolean);
    function uniq(arr) {
        return [...new Set(arr.filter(Boolean))];
    }
    const computedFamilies = uniq(allPageEls.map((el) => el.styles.fontFamily ?? ''));
    const computedSizes = uniq(allPageEls.map((el) => el.styles.fontSize ?? ''));
    const computedWeights = uniq(allPageEls.map((el) => el.styles.fontWeight ?? ''));
    const allFamilies = uniq([...typography.families, ...computedFamilies]);
    const allWeights = uniq([...typography.weights, ...computedWeights])
        .filter((w) => /^\d+$/.test(w)) // only numeric weights
        .sort((a, b) => Number(a) - Number(b));
    // Sizes: merge, strip var() references, sort numerically
    const allSizes = uniq([...typography.sizes, ...computedSizes])
        .filter((s) => /^\d+(\.\d+)?(px|rem|em)$/.test(s.trim()))
        .sort((a, b) => {
        const toNum = (v) => parseFloat(v) * (v.includes('rem') ? 16 : 1);
        return toNum(a) - toNum(b);
    });
    const primaryFamily = allFamilies[0] ?? 'inherit';
    const familySpecimens = allFamilies.slice(0, 4).map((family) => `
    <div class="font-specimen">
      <p class="specimen-text" style="font-family:${family}">
        Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz 0123456789
      </p>
      <div class="font-specimen-meta">
        <code>${esc(family)}</code>
        ${allWeights.length ? `<span>weights: ${allWeights.join(' · ')}</span>` : ''}
      </div>
    </div>`).join('');
    // ── Type scale naming ────────────────────────────────────────────────────
    const ROLE_NAMES = {
        h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
        h4: 'Heading 4', h5: 'Heading 5', h6: 'Heading 6',
        p: 'Paragraph', a: 'Link', li: 'List Item',
        small: 'Small Text', label: 'Label', caption: 'Caption',
    };
    const VARIANT_SUFFIXES = ['Large', 'Medium', 'Small', 'XSmall'];
    // Group by role, sort each group largest → smallest
    const byRole = new Map();
    for (const entry of page.typeScale) {
        const group = byRole.get(entry.role) ?? [];
        group.push(entry);
        byRole.set(entry.role, group);
    }
    // Flatten with semantic names, then sort overall largest → smallest
    const namedScale = [...byRole.entries()].flatMap(([role, entries]) => {
        const sorted = [...entries].sort((a, b) => parseFloat(b.fontSize) - parseFloat(a.fontSize));
        const baseName = ROLE_NAMES[role] ?? role;
        return sorted.map((entry, i) => {
            let name;
            if (sorted.length === 1) {
                name = baseName;
            }
            else if (sorted.length === 2) {
                name = i === 0 ? `${baseName} Large` : `${baseName} Small`;
            }
            else if (sorted.length <= 4) {
                name = `${baseName} ${VARIANT_SUFFIXES[i]}`;
            }
            else {
                name = `${baseName} — ${entry.fontSize}`;
            }
            return { ...entry, name };
        });
    }).sort((a, b) => parseFloat(b.fontSize) - parseFloat(a.fontSize));
    // Fall back to regex-extracted sizes if Playwright captured nothing
    const scaleSource = namedScale.length > 0 ? namedScale : allSizes.map((size) => ({
        fontSize: size, fontWeight: '400', lineHeight: 'normal',
        letterSpacing: 'normal', fontFamily: primaryFamily, name: size, role: '',
    }));
    const typeRows = scaleSource.slice(0, 16).map(({ fontSize, fontWeight, lineHeight, letterSpacing, fontFamily, name }) => {
        const lsDisplay = letterSpacing && letterSpacing !== '0px' && letterSpacing !== 'normal' ? ` · ${esc(letterSpacing)}` : '';
        const lhPx = parseFloat(lineHeight);
        const fsPx = parseFloat(fontSize);
        const lhRatio = !isNaN(lhPx) && !isNaN(fsPx) && fsPx > 0
            ? (Math.round((lhPx / fsPx) * 100) / 100).toFixed(2)
            : lineHeight;
        return `<div class="type-row">
      <div class="type-meta">
        <span class="type-meta-size">${esc(fontSize)}</span>
        <span class="type-meta-weight">${esc(fontWeight)}${lsDisplay} · lh ${esc(lhRatio)}</span>
      </div>
      <div class="type-sample" style="font-size:${fontSize};font-weight:${fontWeight};line-height:${lineHeight};letter-spacing:${letterSpacing};font-family:${fontFamily}">${esc(name)}</div>
    </div>`;
    }).join('');
    const allFontUrls = [
        ...(typography.googleFontsUrl ? [typography.googleFontsUrl] : []),
        ...page.googleFontsLinks,
    ];
    const typographySection = section('typography', 'Foundations', 'Typography', "Font families and type scale derived from the page's rendered styles.", [
        familySpecimens ? sub('Font families', familySpecimens) : '',
        typeRows ? sub('Type scale', `<div class="type-scale">${typeRows}</div>`) : '',
        !familySpecimens && !typeRows ? '<p class="sg-muted">No typography values detected</p>' : '',
        allFontUrls.length
            ? `<p class="sg-gf-link">Google Fonts: <a href="${allFontUrls[0]}" target="_blank" rel="noopener">${esc(allFontUrls[0])}</a></p>`
            : '',
    ].join(''));
    // ─── Spacing ───────────────────────────────────────────────────────────────
    // Use Playwright-sampled scale; fall back to regex if empty
    const spacingSource = page.spacingScale.length
        ? page.spacingScale
        : spacing.filter((v) => /^\d+(\.\d+)?px$/.test(v)).map((v) => {
            const px = parseFloat(v);
            const rem = px / 16;
            return { px, rem: `${rem}rem`, sources: [] };
        });
    // Max bar width: largest value maps to 400px, others proportional
    const maxPx = Math.max(...spacingSource.map((s) => s.px), 1);
    const spacingBars = spacingSource.slice(0, 20).map(({ px, rem }) => {
        const barWidth = Math.round((px / maxPx) * 400);
        // Only show rem when it's actually a rem value (not a px fallback)
        const remLabel = rem.endsWith('rem') ? `<span class="space-rem">${esc(rem)}</span>` : '';
        return `<div class="space-row">
      <span class="space-label">${px}px</span>
      <div class="space-bar" style="width:${barWidth}px"></div>
      ${remLabel}
    </div>`;
    }).join('');
    const spacingSection = section('spacing', 'Foundations', 'Spacing', 'Spacing values sampled from padding, gap, and margin across visible page elements.', sub('Scale', spacingBars || '<p class="sg-muted">No spacing values detected</p>'));
    // ─── Borders & Radius (combined) ──────────────────────────────────────────
    const radiusSource = page.radiusScale.length
        ? page.radiusScale
        : radius.map((v) => ({ value: v, px: parseFloat(v) }));
    const radiusItems = radiusSource.slice(0, 10).map(({ value }) => `
    <div class="radius-item">
      <div class="radius-preview" style="border-radius:${value}"></div>
      <div class="radius-label">${esc(value)}</div>
    </div>`).join('');
    const borderItems = page.borderScale.slice(0, 10).map(({ width, color, style }) => `
    <div class="border-row">
      <div class="border-preview" style="border:${width} ${style} ${color}"></div>
      <div class="border-meta">
        <span class="border-width">${esc(width)}</span>
        <span class="border-style">${esc(style)}</span>
        <span class="border-color">${esc(color)}</span>
      </div>
    </div>`).join('');
    const bordersAndRadiusSection = (radiusSource.length || page.borderScale.length) ? section('borders', 'Foundations', 'Borders & Radius', 'Border styles and radius values sampled from buttons, inputs, cards, and dividers.', [
        radiusItems ? sub('Border Radius', `<div class="sg-flex-16">${radiusItems}</div>`) : '',
        borderItems ? sub('Border Styles', `<div class="border-scale">${borderItems}</div>`) : '',
        !radiusItems && !borderItems ? '<p class="sg-muted">No border values detected</p>' : '',
    ].join('')) : '';
    // ─── Shadows ───────────────────────────────────────────────────────────────
    const shadowSource = page.shadowScale.length
        ? page.shadowScale
        : shadows.map((v) => ({ value: v }));
    const shadowItems = shadowSource.slice(0, 6).map(({ value }, i) => `
    <div class="shadow-item">
      <div class="shadow-preview" style="box-shadow:${value}"></div>
      <div class="shadow-label-name">Shadow ${i + 1}</div>
      <div class="shadow-label-val">${esc(value)}</div>
    </div>`).join('');
    const shadowsSection = section('shadows', 'Foundations', 'Shadows & Effects', 'Box-shadow values sampled from cards, modals, and elevated elements.', sub('Values', shadowItems
        ? `<div class="sg-grid-3">${shadowItems}</div>`
        : '<p class="sg-muted">No box-shadow values detected</p>'));
    // ─── Motion ────────────────────────────────────────────────────────────────
    // Deduplicate motion by duration+easing — many properties share the same timing
    const seenMotionKey = new Set();
    const dedupedMotion = page.motionScale.filter(({ duration, easing }) => {
        const key = `${duration}|${easing}`;
        if (seenMotionKey.has(key))
            return false;
        seenMotionKey.add(key);
        return true;
    });
    const motionItems = dedupedMotion.slice(0, 8).map(({ duration, easing, property }, i) => {
        // Sanitize for use as inline style value — strip anything after delay
        const safeTransition = `all ${duration} ${easing}`;
        const uid = `motion-demo-${i}`;
        return `<div class="motion-row">
      <div class="motion-demo-wrap">
        <div class="motion-demo" id="${uid}" style="transition:${safeTransition}"
          onmouseenter="this.classList.add('motion-active')"
          onmouseleave="this.classList.remove('motion-active')">
          Hover me
        </div>
      </div>
      <div class="motion-meta">
        <span class="motion-duration">${esc(duration)}</span>
        <span class="motion-easing">${esc(easing)}</span>
        <span class="motion-property">${esc(property)}</span>
      </div>
    </div>`;
    }).join('');
    const motionSection = page.motionScale.length ? section('motion', 'Foundations', 'Motion', 'Transition values sampled from interactive elements. Hover each demo to see the timing and easing in action.', sub('Transitions', `<div class="motion-scale">${motionItems}</div>`)) : '';
    // ─── Atoms ─────────────────────────────────────────────────────────────────
    const btnRadius = radius.find((r) => /px$/.test(r) && parseInt(r) >= 4) ?? '8px';
    const transition = animations.transitions[0] ?? '0.2s ease';
    // Inline style string from a computed element's styles
    function inlineStyle(s, keys) {
        return keys
            .filter((k) => s[k] && s[k] !== 'none' && s[k] !== 'normal' && s[k] !== 'auto')
            .map((k) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${s[k]}`)
            .join(';');
    }
    // Buttons — real variants from page, fallback to hardcoded
    const realButtons = page.components.buttons;
    const buttonsBody = realButtons.length
        ? `<div class="sg-flex">${realButtons.map((b) => {
            const s = inlineStyle(b.styles, ['backgroundColor', 'color', 'borderRadius', 'padding', 'fontSize', 'fontWeight', 'border', 'boxShadow']);
            const label = b.text.trim() || b.tag;
            return `<button style="${s};cursor:pointer;display:inline-flex;align-items:center;white-space:nowrap;text-decoration:none;font-family:inherit">${esc(label)}</button>`;
        }).join('')}</div>`
        : `<div class="sg-flex">
        <button class="btn btn-primary btn-lg">Primary</button>
        <button class="btn btn-ghost btn-lg">Ghost</button>
        <button class="btn btn-accent btn-lg">Accent</button>
        <button class="btn btn-primary btn-md" disabled>Disabled</button>
      </div>`;
    const buttonsFooter = realButtons.length
        ? `${realButtons.length} button variant${realButtons.length > 1 ? 's' : ''} extracted from page`
        : 'fallback — no buttons detected on page';
    const buttonsAtom = sub('Buttons', card(buttonsBody, buttonsFooter));
    // Badges/tags — real variants from page, fallback to hardcoded
    const realBadges = page.components.badges;
    const badgesBody = realBadges.length
        ? `<div class="sg-flex">${realBadges.map((b) => {
            const s = inlineStyle(b.styles, ['backgroundColor', 'color', 'borderRadius', 'padding', 'fontSize', 'fontWeight', 'border']);
            const label = b.text.trim() || b.tag;
            return `<span style="${s};display:inline-flex;align-items:center;white-space:nowrap">${esc(label)}</span>`;
        }).join('')}</div>`
        : `<div class="sg-flex">
        <span class="tag">Default</span>
        <span class="tag tag-blue"><span class="tag-dot"></span>Info</span>
        <span class="tag tag-green"><span class="tag-dot"></span>Success</span>
        <span class="tag tag-yellow"><span class="tag-dot"></span>Warning</span>
        <span class="tag tag-red"><span class="tag-dot"></span>Error</span>
      </div>`;
    const tagsAtom = sub('Tags & Badges', card(badgesBody, realBadges.length
        ? `${realBadges.length} badge/tag variant${realBadges.length > 1 ? 's' : ''} extracted from page`
        : 'fallback — no badges detected on page'));
    // Inputs — real styles from page, fallback to hardcoded
    const realInput = page.components.inputs[0];
    const realTextarea = page.components.textareas[0];
    const inputsAtom = sub('Form Inputs', `<div class="sg-grid-2">
      ${card(`
        <label class="input-label">Default</label>
        <input type="text" placeholder="Placeholder text" style="${realInput ? inlineStyle(realInput.styles, ['backgroundColor', 'color', 'borderRadius', 'padding', 'fontSize', 'border']) + ';width:100%;display:block;outline:none;box-sizing:border-box' : ''}" class="${realInput ? '' : 'input'}" />
        <label class="input-label" style="margin-top:16px">Disabled</label>
        <input type="text" placeholder="Disabled" disabled style="opacity:0.4;${realInput ? inlineStyle(realInput.styles, ['backgroundColor', 'color', 'borderRadius', 'padding', 'fontSize', 'border']) + ';width:100%;display:block;cursor:not-allowed;box-sizing:border-box' : ''}" class="${realInput ? '' : 'input'}" />
      `, realInput ? 'input styles extracted from page' : 'fallback styles')}
      ${card(`
        <label class="input-label">Textarea</label>
        <textarea placeholder="Multi-line input..." style="${realTextarea ? inlineStyle(realTextarea.styles, ['backgroundColor', 'color', 'borderRadius', 'padding', 'fontSize', 'border']) + ';width:100%;display:block;resize:vertical;min-height:100px;outline:none;box-sizing:border-box' : ''}" class="${realTextarea ? '' : 'textarea'}"></textarea>
      `, realTextarea ? 'textarea styles extracted from page' : 'fallback styles')}
    </div>`);
    const avatarsAtom = sub('Avatars', card(`<div class="sg-flex">
        <div class="avatar avatar-lg">AB</div>
        <div class="avatar avatar-md">AB</div>
        <div class="avatar avatar-sm">AB</div>
      </div>`, 'avatar · avatar-sm / avatar-md / avatar-lg'));
    const dividersAtom = sub('Dividers', card(`<hr class="divider" />`));
    const atomsSection = section('atoms', 'Atoms', 'Atoms', "Interactive primitives rendered with styles extracted directly from the page via computed styles.", [buttonsAtom, tagsAtom, inputsAtom, avatarsAtom, dividersAtom].join(''));
    // ─── Molecules & Organisms ─────────────────────────────────────────────────
    // Phase 3 — not yet implemented. Will render as clean reconstructed HTML.
    const moleculesSection = '';
    const organismsSection = '';
    // ─── Animations ────────────────────────────────────────────────────────────
    const animationsSection = section('animations', 'Patterns', 'Animations & Transitions', 'Motion values extracted from transition and animation declarations.', `<div class="sg-grid-2">
      ${card(`<h4 class="sg-card-inner-title">Transitions</h4>${tokenList(animations.transitions.slice(0, 8))}`)}
      ${card(`<h4 class="sg-card-inner-title">Animations</h4>${tokenList(animations.animations.slice(0, 8))}`)}
    </div>`);
    // ─── Layout ────────────────────────────────────────────────────────────────
    const layoutSection = section('layout', 'Patterns', 'Layout', "Max-widths, grid templates, and responsive breakpoints extracted from the site's CSS.", `<div class="sg-grid-2" style="margin-bottom:24px">
      ${card(`<h4 class="sg-card-inner-title">Max widths</h4>${tokenList(layout.maxWidths.slice(0, 10))}`)}
      ${card(`<h4 class="sg-card-inner-title">Grid columns</h4>${tokenList(layout.gridColumns.slice(0, 8))}`)}
    </div>
    ${layout.breakpoints.length ? sub('Breakpoints', tokenList(layout.breakpoints.slice(0, 8))) : ''}`);
    // ─── Components ────────────────────────────────────────────────────────────
    const componentChips = components.length
        ? `<div class="sg-flex">${components.map((c) => `
        <div class="component-chip">
          <span class="component-name">${esc(c.name)}</span>
          <span class="component-source">${c.source}</span>
        </div>`).join('')}</div>`
        : '<p class="sg-muted">No named components detected via data attributes or semantic classes.</p>';
    const componentsSection = section('components', 'Patterns', 'Detected Components', 'Component names discovered from data attributes and semantic class patterns in the HTML.', componentChips);
    // ─── HTML ──────────────────────────────────────────────────────────────────
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${hostname} — Design System</title>
  ${googleFontsLinks}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    :root {
      --black:   #000;
      --bg:      #0e0e0e;
      --bg-card: #1a1a1a;
      --border:  #2a2a2a;
      --white:   #fff;
      --gray:    #888;
      --blue:    #09f;
      --success: #4ade80;
      --warning: #fbbf24;
      --error:   #f87171;
      --white-5:  rgba(255,255,255,0.05);
      --white-10: rgba(255,255,255,0.10);
      --white-25: rgba(255,255,255,0.25);
      --white-50: rgba(255,255,255,0.50);
      --accent:  ${accentColor};
      --mono:    ui-monospace, 'Cascadia Code', Consolas, monospace;
      --sans:    system-ui, -apple-system, sans-serif;
      --transition: ${transition};
      --max-w:   1200px;
      --btn-radius: ${btnRadius};
    }

    body {
      background: var(--bg);
      color: var(--gray);
      font: 15px/1.6 var(--sans);
      -webkit-font-smoothing: antialiased;
    }

    a { color: var(--blue); text-decoration: underline; }
    a:hover { color: var(--white); }
    code {
      font-family: var(--mono);
      font-size: 12px;
      background: rgba(255,255,255,0.07);
      padding: 2px 7px;
      border-radius: 5px;
      color: var(--white);
      word-break: break-all;
    }

    /* ── Header ──────────────────────────────────────────────────────── */
    .sg-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: rgba(14,14,14,0.9);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      padding: 0 40px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
    }
    .sg-header-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .sg-header-brand a {
      font-size: 14px;
      font-weight: 600;
      color: var(--white);
      text-decoration: none;
    }
    .sg-header-brand a:hover { color: var(--blue); }
    .sg-header-brand span {
      font-size: 11px;
      font-family: var(--mono);
      color: var(--gray);
      background: var(--bg-card);
      border: 1px solid var(--border);
      padding: 2px 8px;
      border-radius: 100px;
    }
    .sg-nav {
      display: flex;
      gap: 4px;
      overflow-x: auto;
    }
    .sg-nav a {
      font-size: 13px;
      font-weight: 500;
      color: var(--gray);
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 6px;
      white-space: nowrap;
      transition: color 0.15s, background 0.15s;
    }
    .sg-nav a:hover { color: var(--white); }
    .sg-nav a.active { color: var(--white); background: var(--white-5); }

    /* ── Page ────────────────────────────────────────────────────────── */
    .sg-page {
      max-width: var(--max-w);
      margin: 0 auto;
      padding: 72px 40px 120px;
    }
    .sg-page-title {
      font-size: 56px;
      font-weight: 400;
      letter-spacing: -0.03em;
      line-height: 1.1;
      color: var(--white);
      margin-bottom: 12px;
    }
    .sg-page-desc {
      font-size: 16px;
      color: var(--gray);
      max-width: 560px;
      line-height: 1.65;
      margin-bottom: 80px;
    }
    .sg-page-desc a { color: var(--blue); }

    /* ── Section ─────────────────────────────────────────────────────── */
    .sg-section {
      margin-bottom: 100px;
      opacity: 0;
      transform: translateY(16px);
      transition: opacity 0.45s ease, transform 0.45s ease;
    }
    .sg-section.visible { opacity: 1; transform: translateY(0); }
    @media (prefers-reduced-motion: reduce) {
      .sg-section { opacity: 1; transform: none; transition: none; }
    }
    .sg-section-label {
      font-family: var(--mono);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--blue);
      margin-bottom: 8px;
    }
    .sg-section-title {
      font-size: 32px;
      font-weight: 400;
      letter-spacing: -0.02em;
      color: var(--white);
      line-height: 1.2;
      margin-bottom: 10px;
    }
    .sg-section-desc {
      font-size: 14px;
      color: var(--gray);
      max-width: 560px;
      line-height: 1.65;
      margin-bottom: 40px;
    }

    /* ── Sub-section ─────────────────────────────────────────────────── */
    .sg-sub { margin-bottom: 48px; }
    .sg-sub-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--white);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sg-sub-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border);
    }

    /* ── Card ────────────────────────────────────────────────────────── */
    .sg-card {
      border: 1px solid var(--border);
      border-radius: 16px;
      background: rgba(255,255,255,0.02);
      overflow: hidden;
    }
    .sg-card-body { padding: 28px 32px; }
    .sg-card-footer {
      padding: 12px 32px;
      border-top: 1px solid var(--border);
      font-family: var(--mono);
      font-size: 12px;
      color: var(--gray);
      background: var(--black);
    }
    .sg-card-inner-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--white);
      margin-bottom: 12px;
    }

    /* ── Grid & flex helpers ─────────────────────────────────────────── */
    .sg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .sg-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
    .sg-grid-4 { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 14px; }
    .sg-flex { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .sg-flex-16 { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
    .sg-flex-col { display: flex; flex-direction: column; gap: 24px; }

    /* ── Token list ──────────────────────────────────────────────────── */
    .sg-token-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
    .sg-muted { font-size: 13px; color: rgba(255,255,255,0.25); }

    /* ── Colors ──────────────────────────────────────────────────────── */
    .color-swatch { border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
    .color-swatch-preview { height: 80px; }
    .color-swatch-info { padding: 10px 12px; background: var(--bg-card); }
    .color-swatch-var { font-family: var(--mono); font-size: 10px; color: var(--blue); margin-bottom: 2px; }
    .color-swatch-name { font-family: var(--mono); font-size: 11px; color: var(--white); word-break: break-all; margin-bottom: 2px; }
    .color-swatch-count { font-size: 11px; color: var(--gray); }

    /* ── CSS Vars ────────────────────────────────────────────────────── */
    .css-var-table { display: flex; flex-direction: column; }
    .css-var-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 8px 0;
      border-bottom: 1px solid var(--border);
    }
    .css-var-row:last-child { border-bottom: none; }
    .css-var-name { font-size: 12px; flex-shrink: 0; min-width: 220px; color: var(--blue); }
    .css-var-value {
      font-size: 12px;
      color: var(--gray);
      word-break: break-all;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .css-var-swatch {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: 3px;
      border: 1px solid var(--border);
      flex-shrink: 0;
    }

    /* ── Typography ──────────────────────────────────────────────────── */
    .font-specimen {
      margin-bottom: 16px;
      padding: 24px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .specimen-text {
      font-size: 24px;
      color: var(--white);
      margin-bottom: 10px;
      line-height: 1.4;
      word-break: break-word;
    }
    .font-specimen-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .font-specimen-meta span { font-size: 12px; color: var(--gray); }
    .type-scale { display: flex; flex-direction: column; }
    .type-row {
      display: flex;
      align-items: baseline;
      gap: 24px;
      padding: 14px 0;
      border-bottom: 1px solid var(--border);
    }
    .type-row:last-child { border-bottom: none; }
    .type-meta {
      min-width: 160px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .type-meta-size { font-family: var(--mono); font-size: 12px; color: var(--white); }
    .type-meta-weight { font-family: var(--mono); font-size: 11px; color: var(--gray); }
    .type-sample { color: var(--white); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; }
    .sg-gf-link { font-size: 12px; margin-top: 16px; color: var(--gray); }

    /* ── Spacing ─────────────────────────────────────────────────────── */
    .space-row { display: flex; align-items: center; gap: 16px; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .space-row:last-child { border-bottom: none; }
    .space-label { font-family: var(--mono); font-size: 12px; color: var(--gray); min-width: 48px; text-align: right; flex-shrink: 0; }
    .space-bar {
      height: 24px;
      background: rgba(0, 153, 255, 0.2);
      border: 1px solid rgba(0, 153, 255, 0.4);
      border-radius: 4px;
      min-width: 4px;
      flex-shrink: 0;
    }
    .space-rem { font-family: var(--mono); font-size: 11px; color: rgba(255,255,255,0.25); flex-shrink: 0; }

    /* ── Radius ──────────────────────────────────────────────────────── */
    .radius-item { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .radius-preview {
      width: 64px;
      height: 64px;
      background: var(--bg-card);
      border: 1px solid var(--white-25);
    }
    .radius-label { font-family: var(--mono); font-size: 11px; color: var(--gray); text-align: center; }

    /* ── Shadows ─────────────────────────────────────────────────────── */
    .shadow-item { display: flex; flex-direction: column; gap: 10px; }
    .shadow-preview { height: 80px; border-radius: 12px; background: var(--bg-card); }
    .shadow-label-name { font-size: 13px; font-weight: 600; color: var(--white); }
    .shadow-label-val { font-family: var(--mono); font-size: 11px; color: var(--gray); word-break: break-all; }

    /* ── Motion ──────────────────────────────────────────────────────── */
    .motion-scale { display: flex; flex-direction: column; }
    .motion-row {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 14px 0;
      border-bottom: 1px solid var(--border);
    }
    .motion-row:last-child { border-bottom: none; }
    .motion-meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 180px;
      flex-shrink: 0;
    }
    .motion-duration { font-family: var(--mono); font-size: 13px; color: var(--white); }
    .motion-easing  { font-family: var(--mono); font-size: 11px; color: var(--gray); }
    .motion-property { font-family: var(--mono); font-size: 10px; color: rgba(255,255,255,0.2); }
    .motion-demo-wrap { flex-shrink: 0; }
    .motion-demo {
      padding: 10px 24px;
      background: var(--white-5);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 13px;
      color: var(--gray);
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    .motion-demo.motion-active {
      background: var(--accent);
      border-color: var(--accent);
      color: #fff;
      transform: translateY(-3px);
    }

    /* ── Borders ─────────────────────────────────────────────────────── */
    .border-scale { display: flex; flex-direction: column; }
    .border-row {
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
    }
    .border-row:last-child { border-bottom: none; }
    .border-preview {
      width: 120px;
      height: 32px;
      border-radius: 6px;
      flex-shrink: 0;
      background: transparent;
    }
    .border-meta { display: flex; gap: 16px; align-items: baseline; }
    .border-width  { font-family: var(--mono); font-size: 13px; color: var(--white); }
    .border-style  { font-family: var(--mono); font-size: 11px; color: var(--gray); }
    .border-color  { font-family: var(--mono); font-size: 11px; color: rgba(255,255,255,0.3); word-break: break-all; }

    /* ── Atoms: Buttons ──────────────────────────────────────────────── */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: var(--sans);
      font-weight: 600;
      border: none;
      cursor: pointer;
      border-radius: var(--btn-radius);
      transition: opacity var(--transition), background var(--transition), border-color var(--transition), transform 0.12s ease;
      text-decoration: none;
      white-space: nowrap;
      line-height: 1;
    }
    .btn:active { transform: scale(0.97); }
    .btn[disabled] { opacity: 0.35; cursor: not-allowed; pointer-events: none; }
    .btn-primary { background: var(--white); color: var(--black); }
    .btn-primary:hover { opacity: 0.85; }
    .btn-ghost { background: transparent; color: var(--white); border: 1px solid var(--white-25); }
    .btn-ghost:hover { background: var(--white-5); border-color: var(--white-50); }
    .btn-accent { background: var(--accent); color: var(--white); }
    .btn-accent:hover { opacity: 0.85; }
    .btn-sm { font-size: 12px; padding: 7px 16px; }
    .btn-md { font-size: 14px; padding: 10px 22px; }
    .btn-lg { font-size: 15px; padding: 13px 28px; }

    /* ── Atoms: Tags ─────────────────────────────────────────────────── */
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 14px;
      border-radius: 100px;
      font-size: 13px;
      font-weight: 500;
      border: 1px solid var(--border);
      background: var(--bg-card);
      color: var(--white);
    }
    .tag-sm { font-size: 11px; padding: 3px 10px; }
    .tag-blue   { border-color: rgba(0,153,255,0.3);   background: rgba(0,153,255,0.08);   color: #09f; }
    .tag-green  { border-color: rgba(74,222,128,0.3);  background: rgba(74,222,128,0.08);  color: var(--success); }
    .tag-yellow { border-color: rgba(251,191,36,0.3);  background: rgba(251,191,36,0.08);  color: var(--warning); }
    .tag-red    { border-color: rgba(248,113,113,0.3); background: rgba(248,113,113,0.08); color: var(--error); }
    .tag-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

    /* ── Atoms: Inputs ───────────────────────────────────────────────── */
    .input-label { display: block; font-size: 13px; font-weight: 500; color: var(--white); margin-bottom: 6px; }
    .input {
      font-family: var(--sans);
      font-size: 14px;
      color: var(--white);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 14px;
      outline: none;
      transition: border-color 0.2s;
      width: 100%;
      display: block;
    }
    .input::placeholder { color: #444; }
    .input:focus { border-color: var(--white-25); }
    .input:disabled { opacity: 0.35; cursor: not-allowed; }
    .input-error { border-color: var(--error); }
    .textarea {
      font-family: var(--sans);
      font-size: 14px;
      color: var(--white);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 10px 14px;
      outline: none;
      transition: border-color 0.2s;
      width: 100%;
      resize: vertical;
      min-height: 100px;
      display: block;
    }
    .textarea::placeholder { color: #444; }
    .textarea:focus { border-color: var(--white-25); }

    /* ── Atoms: Avatars ──────────────────────────────────────────────── */
    .avatar {
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      color: var(--white);
      background: linear-gradient(135deg, var(--accent), rgba(0,0,0,0.5));
      flex-shrink: 0;
    }
    .avatar-lg { width: 56px; height: 56px; font-size: 16px; }
    .avatar-md { width: 40px; height: 40px; font-size: 13px; }
    .avatar-sm { width: 28px; height: 28px; font-size: 10px; }

    /* ── Atoms: Divider ──────────────────────────────────────────────── */
    .divider { border: none; border-top: 1px solid var(--border); margin: 8px 0; }

    /* ── Components ──────────────────────────────────────────────────── */
    .component-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 5px 12px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 100px;
    }
    .component-name { color: var(--white); font-size: 13px; }
    .component-source { font-family: var(--mono); font-size: 10px; color: var(--gray); }

    /* ── Responsive ──────────────────────────────────────────────────── */
    @media (max-width: 768px) {
      .sg-page { padding: 40px 20px 80px; }
      .sg-page-title { font-size: 36px; }
      .sg-grid-2, .sg-grid-3 { grid-template-columns: 1fr; }
      .sg-header { padding: 0 20px; }
      .sg-nav { display: none; }
    }
  </style>
</head>
<body>

<header class="sg-header">
  <div class="sg-header-brand">
    <a href="${sourceUrl}" target="_blank" rel="noopener">↗ ${hostname}</a>
    <span>Design System</span>
  </div>
  <nav class="sg-nav">
    <a href="#colors">Colors</a>
    <a href="#typography">Typography</a>
    ${bordersAndRadiusSection ? '<a href="#borders">Borders &amp; Radius</a>' : ''}
    <a href="#spacing">Spacing</a>
    <a href="#shadows">Shadows</a>
    ${motionSection ? '<a href="#motion">Motion</a>' : ''}
    <a href="#atoms">Atoms</a>
    ${moleculesSection ? '<a href="#molecules">Molecules</a>' : ''}
    ${organismsSection ? '<a href="#organisms">Organisms</a>' : ''}
    <a href="#animations">Animations</a>
    <a href="#layout">Layout</a>
    <a href="#components">Components</a>
  </nav>
</header>

<main class="sg-page">
  <h1 class="sg-page-title">${hostname}</h1>
  <p class="sg-page-desc">
    Design system extracted from <a href="${sourceUrl}" target="_blank" rel="noopener">${sourceUrl}</a>.
    Colors, typography, spacing, and component patterns derived procedurally from the site&#39;s stylesheets.
  </p>

  ${colorsSection}
  ${typographySection}
  ${bordersAndRadiusSection}
  ${spacingSection}
  ${shadowsSection}
  ${motionSection}
  ${atomsSection}
  ${moleculesSection}
  ${organismsSection}
  ${animationsSection}
  ${layoutSection}
  ${componentsSection}
</main>

<script>
  const navLinks = document.querySelectorAll('.sg-nav a[href^="#"]');
  const sections = document.querySelectorAll('.sg-section[id]');

  // Scroll-spy
  const spyObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          navLinks.forEach((a) => a.classList.remove('active'));
          const active = document.querySelector('.sg-nav a[href="#' + entry.target.id + '"]');
          if (active) active.classList.add('active');
        }
      }
    },
    { rootMargin: '-15% 0px -75% 0px' },
  );
  sections.forEach((s) => spyObserver.observe(s));

  // Fade-in on scroll
  const fadeObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.06 },
  );
  sections.forEach((s) => fadeObserver.observe(s));
</script>
</body>
</html>`;
}
