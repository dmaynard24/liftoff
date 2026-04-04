import type { Tokens } from './tokens.js';
import type { ComponentInfo } from './components.js';

export function generateStyleguide(
  sourceUrl: string,
  tokens: Tokens,
  components: ComponentInfo[],
): string {
  const { colors, cssVars, typography, spacing, radius, shadows, animations, layout } = tokens;

  const hostname = new URL(sourceUrl).hostname;

  // Pick a primary accent from top chromatic color, fall back to a neutral
  const accentColor = colors.chromatic[0]?.value ?? '#7c6dfa';

  // ─── Google Fonts ──────────────────────────────────────────────────────────
  const googleFontsLinks = typography.googleFontsUrl
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="${typography.googleFontsUrl}">`
    : '';

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const esc = (s: string) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function section(id: string, label: string, title: string, desc: string, body: string): string {
    return `
  <section class="sg-section" id="${id}">
    <p class="sg-section-label">${label}</p>
    <h2 class="sg-section-title">${title}</h2>
    <p class="sg-section-desc">${desc}</p>
    ${body}
  </section>`;
  }

  function sub(title: string, body: string): string {
    return `<div class="sg-sub"><h3 class="sg-sub-title">${title}</h3>${body}</div>`;
  }

  function card(body: string, footer?: string): string {
    return `<div class="sg-card"><div class="sg-card-body">${body}</div>${footer ? `<div class="sg-card-footer">${footer}</div>` : ''}</div>`;
  }

  function tokenList(items: string[]): string {
    if (!items.length) return '<p class="sg-muted">None detected</p>';
    return `<ul class="sg-token-list">${items.map((i) => `<li><code>${esc(i)}</code></li>`).join('')}</ul>`;
  }

  // ─── Colors ────────────────────────────────────────────────────────────────
  const colorSwatch = ({ value, count }: { value: string; count: number }) => `
      <div class="color-swatch">
        <div class="color-swatch-preview" style="background:${value}"></div>
        <div class="color-swatch-info">
          <div class="color-swatch-name">${esc(value)}</div>
          <div class="color-swatch-value">${count}×</div>
        </div>
      </div>`;

  const colorsSection = section(
    'colors', 'Foundations', 'Colors',
    "All color values extracted from the site's stylesheets, deduplicated and grouped by hue.",
    [
      colors.chromatic.length ? sub('Chromatic',
        `<div class="sg-grid-4">${colors.chromatic.map(colorSwatch).join('')}</div>`) : '',
      colors.grayscale.length ? sub('Grayscale',
        `<div class="sg-grid-4">${colors.grayscale.map(colorSwatch).join('')}</div>`) : '',
      colors.rgba.length ? sub('Opacity variants',
        `<div class="sg-grid-4">${colors.rgba.map(colorSwatch).join('')}</div>`) : '',
    ].join(''),
  );

  // ─── CSS Variables ─────────────────────────────────────────────────────────
  const cssVarsSection = cssVars.length ? section(
    'css-vars', 'Foundations', 'CSS Variables',
    "Custom properties declared in the site's stylesheets — the source of truth for named design tokens.",
    sub('All custom properties',
      `<div class="sg-grid-2">${cssVars.slice(0, 40).map(({ name, value }) => `
        <div class="css-var-row">
          <code class="css-var-name">${esc(name)}</code>
          <span class="css-var-value">${esc(value)}</span>
        </div>`).join('')}</div>`,
    ),
  ) : '';

  // ─── Typography ────────────────────────────────────────────────────────────
  const familySpecimens = typography.families.slice(0, 4).map((family) => `
    <div class="font-specimen">
      <p class="specimen-text" style="font-family:${family}">
        AaBbCcDd EeFfGgHh IiJjKkLl 0123456789 !@#$
      </p>
      <code>${esc(family)}</code>
    </div>`).join('');

  const typeRows = typography.sizes.slice(0, 14).map((size) => `
    <div class="type-row">
      <div class="type-meta">
        <div class="type-meta-size">${esc(size)}</div>
      </div>
      <div class="type-sample" style="font-size:${size}">The quick brown fox jumps over the lazy dog</div>
    </div>`).join('');

  const typographySection = section(
    'typography', 'Foundations', 'Typography',
    'Font families, type scale, weights, and spacing values used across the site.',
    [
      familySpecimens ? sub('Font families', familySpecimens) : '',
      typeRows ? sub('Type scale', `<div>${typeRows}</div>`) : '',
      sub('Weights & spacing',
        `<div class="sg-grid-2">
          ${card(`<h4 class="sg-card-inner-title">Weights</h4>${tokenList(typography.weights)}`)}
          ${card(`<h4 class="sg-card-inner-title">Letter spacing</h4>${tokenList(typography.letterSpacings)}`)}
        </div>`),
      typography.googleFontsUrl
        ? `<p class="sg-gf-link">Google Fonts: <a href="${typography.googleFontsUrl}" target="_blank" rel="noopener">${esc(typography.googleFontsUrl)}</a></p>`
        : '',
    ].join(''),
  );

  // ─── Spacing ───────────────────────────────────────────────────────────────
  const spacingBars = spacing.slice(0, 16).map((val) => `
    <div class="space-row">
      <span class="space-label">${esc(val)}</span>
      <div class="space-bar" style="width:${val};max-width:60%"></div>
    </div>`).join('');

  const spacingSection = section(
    'spacing', 'Foundations', 'Spacing',
    'Spacing scale derived from padding, gap, and margin values found in the stylesheets.',
    sub('Scale', spacingBars || '<p class="sg-muted">No spacing values detected</p>'),
  );

  // ─── Radius ────────────────────────────────────────────────────────────────
  const radiusItems = radius.slice(0, 10).map((val) => `
    <div class="radius-item">
      <div class="radius-preview" style="border-radius:${val}"></div>
      <div class="radius-label">${esc(val)}</div>
    </div>`).join('');

  const radiusSection = section(
    'radius', 'Foundations', 'Border Radius',
    "All border-radius values extracted from the site's CSS.",
    sub('Values',
      radiusItems
        ? `<div class="sg-flex-16">${radiusItems}</div>`
        : '<p class="sg-muted">No border-radius values detected</p>',
    ),
  );

  // ─── Shadows ───────────────────────────────────────────────────────────────
  const shadowItems = shadows.slice(0, 6).map((val, i) => `
    <div class="shadow-item">
      <div class="shadow-preview" style="box-shadow:${val}"></div>
      <div class="shadow-label-name">Shadow ${i + 1}</div>
      <div class="shadow-label-val">${esc(val)}</div>
    </div>`).join('');

  const shadowsSection = section(
    'shadows', 'Foundations', 'Shadows & Effects',
    'Box-shadow values used on cards, modals, and interactive elements.',
    sub('Values',
      shadowItems
        ? `<div class="sg-grid-3">${shadowItems}</div>`
        : '<p class="sg-muted">No box-shadow values detected</p>',
    ),
  );

  // ─── Atoms ─────────────────────────────────────────────────────────────────
  // Derive a border-radius for components from the smallest extracted radius, or default
  const btnRadius = radius.find((r) => /px$/.test(r) && parseInt(r) >= 4) ?? '8px';
  const transition = animations.transitions[0] ?? '0.2s ease';

  const buttonsAtom = sub('Buttons',
    card(
      `<div class="sg-flex">
        <button class="btn btn-primary btn-lg">Primary</button>
        <button class="btn btn-ghost btn-lg">Ghost</button>
        <button class="btn btn-accent btn-lg">Accent</button>
      </div>
      <div class="sg-flex" style="margin-top:12px">
        <button class="btn btn-primary btn-sm">Small</button>
        <button class="btn btn-primary btn-md">Medium</button>
        <button class="btn btn-primary btn-lg">Large</button>
        <button class="btn btn-primary btn-md" disabled>Disabled</button>
      </div>`,
      'btn · btn-primary / btn-ghost / btn-accent · btn-sm / btn-md / btn-lg',
    ),
  );

  const tagsAtom = sub('Tags & Badges',
    card(
      `<div class="sg-flex">
        <span class="tag">Default</span>
        <span class="tag tag-blue"><span class="tag-dot"></span>Info</span>
        <span class="tag tag-green"><span class="tag-dot"></span>Success</span>
        <span class="tag tag-yellow"><span class="tag-dot"></span>Warning</span>
        <span class="tag tag-red"><span class="tag-dot"></span>Error</span>
      </div>
      <div class="sg-flex" style="margin-top:12px">
        <span class="tag tag-sm">Small</span>
        <span class="tag tag-sm tag-blue">Small info</span>
        <span class="tag tag-sm tag-green">Small success</span>
      </div>`,
      'tag · tag-blue / tag-green / tag-yellow / tag-red · tag-sm',
    ),
  );

  const inputsAtom = sub('Form Inputs',
    `<div class="sg-grid-2">
      ${card(`
        <label class="input-label">Default</label>
        <input class="input" type="text" placeholder="Placeholder text" />
        <label class="input-label" style="margin-top:16px">Focus (click)</label>
        <input class="input" type="text" placeholder="Focus state" />
        <label class="input-label" style="margin-top:16px">Error</label>
        <input class="input input-error" type="text" value="Invalid input" />
        <label class="input-label" style="margin-top:16px">Disabled</label>
        <input class="input" type="text" placeholder="Disabled" disabled />
      `)}
      ${card(`
        <label class="input-label">Textarea</label>
        <textarea class="textarea" placeholder="Multi-line input..."></textarea>
      `)}
    </div>`,
  );

  const avatarsAtom = sub('Avatars',
    card(
      `<div class="sg-flex">
        <div class="avatar avatar-lg">AB</div>
        <div class="avatar avatar-md">AB</div>
        <div class="avatar avatar-sm">AB</div>
      </div>`,
      'avatar · avatar-sm / avatar-md / avatar-lg',
    ),
  );

  const dividersAtom = sub('Dividers',
    card(`<hr class="divider" />`),
  );

  const atomsSection = section(
    'atoms', 'Atoms', 'Atoms',
    'Primitive UI components built from the extracted design tokens. Styles are approximated from the site\'s token values.',
    [buttonsAtom, tagsAtom, inputsAtom, avatarsAtom, dividersAtom].join(''),
  );

  // ─── Animations ────────────────────────────────────────────────────────────
  const animationsSection = section(
    'animations', 'Patterns', 'Animations & Transitions',
    'Motion values extracted from transition and animation declarations.',
    `<div class="sg-grid-2">
      ${card(`<h4 class="sg-card-inner-title">Transitions</h4>${tokenList(animations.transitions.slice(0, 8))}`)}
      ${card(`<h4 class="sg-card-inner-title">Animations</h4>${tokenList(animations.animations.slice(0, 8))}`)}
    </div>`,
  );

  // ─── Layout ────────────────────────────────────────────────────────────────
  const layoutSection = section(
    'layout', 'Patterns', 'Layout',
    "Max-widths, grid templates, and responsive breakpoints extracted from the site's CSS.",
    `<div class="sg-grid-2" style="margin-bottom:24px">
      ${card(`<h4 class="sg-card-inner-title">Max widths</h4>${tokenList(layout.maxWidths.slice(0, 10))}`)}
      ${card(`<h4 class="sg-card-inner-title">Grid columns</h4>${tokenList(layout.gridColumns.slice(0, 8))}`)}
    </div>
    ${layout.breakpoints.length ? sub('Breakpoints', tokenList(layout.breakpoints.slice(0, 8))) : ''}`,
  );

  // ─── Components ────────────────────────────────────────────────────────────
  const componentChips = components.length
    ? `<div class="sg-flex">${components.map((c) => `
        <div class="component-chip">
          <span class="component-name">${esc(c.name)}</span>
          <span class="component-source">${c.source}</span>
        </div>`).join('')}</div>`
    : '<p class="sg-muted">No named components detected via data attributes or semantic classes.</p>';

  const componentsSection = section(
    'components', 'Patterns', 'Detected Components',
    'Component names discovered from data attributes and semantic class patterns in the HTML.',
    componentChips,
  );

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

    /* ── Token list ──────────────────────────────────────────────────── */
    .sg-token-list { list-style: none; display: flex; flex-direction: column; gap: 6px; }
    .sg-muted { font-size: 13px; color: rgba(255,255,255,0.25); }

    /* ── Colors ──────────────────────────────────────────────────────── */
    .color-swatch { border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }
    .color-swatch-preview { height: 80px; }
    .color-swatch-info { padding: 10px 12px; background: var(--bg-card); }
    .color-swatch-name { font-family: var(--mono); font-size: 11px; color: var(--white); word-break: break-all; margin-bottom: 2px; }
    .color-swatch-value { font-size: 11px; color: var(--gray); }

    /* ── CSS Vars ────────────────────────────────────────────────────── */
    .css-var-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
    }
    .css-var-name { font-size: 12px; flex-shrink: 0; color: var(--blue); }
    .css-var-value { font-size: 12px; color: var(--gray); word-break: break-all; }

    /* ── Typography ──────────────────────────────────────────────────── */
    .font-specimen {
      margin-bottom: 16px;
      padding: 20px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
    }
    .specimen-text { font-size: 22px; color: var(--white); margin-bottom: 8px; }
    .type-row {
      display: flex;
      align-items: baseline;
      gap: 24px;
      padding: 16px 0;
      border-bottom: 1px solid var(--border);
    }
    .type-row:last-child { border-bottom: none; }
    .type-meta { min-width: 100px; flex-shrink: 0; }
    .type-meta-size { font-family: var(--mono); font-size: 12px; color: var(--gray); }
    .type-sample { color: var(--white); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sg-gf-link { font-size: 12px; margin-top: 12px; color: var(--gray); }

    /* ── Spacing ─────────────────────────────────────────────────────── */
    .space-row { display: flex; align-items: center; gap: 16px; padding: 6px 0; }
    .space-label { font-family: var(--mono); font-size: 12px; color: var(--gray); min-width: 64px; text-align: right; }
    .space-bar {
      height: 24px;
      background: rgba(0, 153, 255, 0.18);
      border: 1px solid rgba(0, 153, 255, 0.35);
      border-radius: 4px;
      min-width: 4px;
    }

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
    ${cssVars.length ? '<a href="#css-vars">Variables</a>' : ''}
    <a href="#typography">Typography</a>
    <a href="#spacing">Spacing</a>
    <a href="#radius">Radius</a>
    <a href="#shadows">Shadows</a>
    <a href="#atoms">Atoms</a>
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
  ${cssVarsSection}
  ${typographySection}
  ${spacingSection}
  ${radiusSection}
  ${shadowsSection}
  ${atomsSection}
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
