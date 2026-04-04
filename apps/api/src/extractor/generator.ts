import type { Tokens } from './tokens.js';
import type { ComponentInfo } from './components.js';

export function generateStyleguide(
  sourceUrl: string,
  tokens: Tokens,
  components: ComponentInfo[],
): string {
  const { colors, typography, spacing, radius, shadows, animations, layout } = tokens;

  const topHexColors = colors.hex.slice(0, 24);
  const topRgbaColors = colors.rgba.slice(0, 12);

  const colorSwatches = (list: { value: string; count: number }[]) =>
    list
      .map(
        ({ value, count }) => `
    <div class="swatch-card">
      <div class="swatch-preview" style="background:${value}"></div>
      <div class="swatch-label">
        <code>${value}</code>
        <span class="count">${count}×</span>
      </div>
    </div>`,
      )
      .join('');

  const typographyRows = typography.sizes
    .slice(0, 12)
    .map(
      (size) => `
    <div class="type-row">
      <span class="type-sample" style="font-size:${size}">Aa — The quick brown fox</span>
      <code>${size}</code>
    </div>`,
    )
    .join('');

  const spacingBars = spacing.slice(0, 16).map(
    (val) => `
    <div class="spacing-row">
      <code>${val}</code>
      <div class="spacing-bar" style="width:${val};max-width:100%"></div>
    </div>`,
  ).join('');

  const radiusBoxes = radius.slice(0, 10).map(
    (val) => `
    <div class="radius-box-wrap">
      <div class="radius-box" style="border-radius:${val}"></div>
      <code>${val}</code>
    </div>`,
  ).join('');

  const shadowCards = shadows.slice(0, 6).map(
    (val) => `
    <div class="shadow-card" style="box-shadow:${val}">
      <code>${val}</code>
    </div>`,
  ).join('');

  const fontFamilySpecimens = typography.families.slice(0, 4).map(
    (family) => `
    <div class="font-specimen">
      <p class="specimen-text" style="font-family:${family}">
        AaBbCcDd EeFfGgHh IiJjKkLl MmNnOoPp QqRrSsTt UuVvWwXx YyZz 0123456789
      </p>
      <code>${family}</code>
    </div>`,
  ).join('');

  const componentList = components.length
    ? components
        .map(
          (c) => `
    <div class="component-chip">
      <span class="component-name">${c.name}</span>
      <span class="component-source">${c.source}</span>
    </div>`,
        )
        .join('')
    : '<p class="muted">No named components detected via data attributes.</p>';

  const transitionList = animations.transitions.slice(0, 8).map(
    (t) => `<li><code>${t}</code></li>`,
  ).join('');
  const animationList = animations.animations.slice(0, 8).map(
    (a) => `<li><code>${a}</code></li>`,
  ).join('');

  const maxWidthList = layout.maxWidths.slice(0, 10).map(
    (w) => `<li><code>${w}</code></li>`,
  ).join('');
  const gridList = layout.gridColumns.slice(0, 6).map(
    (g) => `<li><code>${g}</code></li>`,
  ).join('');

  const googleFontsLink = typography.googleFontsUrl
    ? `<link rel="stylesheet" href="${typography.googleFontsUrl}">`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Design System — ${sourceUrl}</title>
  ${googleFontsLink}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --sidebar-w: 220px;
      --bg: #0f0f11;
      --surface: #19191d;
      --border: rgba(255,255,255,0.08);
      --text: #c1c1c8;
      --text-h: #f0f0f4;
      --accent: #7c6dfa;
      --accent-dim: rgba(124,109,250,0.15);
      --radius: 10px;
      --mono: ui-monospace, 'Cascadia Code', Consolas, monospace;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font: 14px/1.6 system-ui, sans-serif;
      display: flex;
      min-height: 100vh;
    }

    /* Sidebar */
    nav {
      position: fixed;
      top: 0; left: 0;
      width: var(--sidebar-w);
      height: 100vh;
      overflow-y: auto;
      border-right: 1px solid var(--border);
      padding: 24px 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
      background: var(--bg);
      z-index: 10;
    }
    .nav-logo {
      padding: 0 16px 16px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 8px;
    }
    .nav-logo a {
      color: var(--text-h);
      font-weight: 600;
      font-size: 13px;
      text-decoration: none;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nav-logo a:hover { color: var(--accent); }
    .nav-label {
      padding: 8px 16px 4px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.3);
    }
    nav a {
      display: block;
      padding: 6px 16px;
      color: var(--text);
      text-decoration: none;
      font-size: 13px;
      border-radius: 6px;
      margin: 0 8px;
      transition: background 0.15s, color 0.15s;
    }
    nav a:hover, nav a.active {
      background: var(--accent-dim);
      color: var(--accent);
    }

    /* Main */
    main {
      margin-left: var(--sidebar-w);
      padding: 48px 56px;
      max-width: 1100px;
      width: 100%;
    }

    section {
      margin-bottom: 72px;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.5s ease, transform 0.5s ease;
    }
    section.visible {
      opacity: 1;
      transform: translateY(0);
    }
    @media (prefers-reduced-motion: reduce) {
      section { opacity: 1; transform: none; transition: none; }
    }

    h2.section-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 8px;
    }
    h3.group-title {
      font-size: 22px;
      font-weight: 600;
      color: var(--text-h);
      margin-bottom: 24px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
    }
    h4.sub-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-h);
      margin: 24px 0 12px;
    }

    /* Cards / surfaces */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px;
    }

    /* Color swatches */
    .swatch-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: 12px;
    }
    .swatch-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
      background: var(--surface);
    }
    .swatch-preview {
      height: 60px;
      width: 100%;
    }
    .swatch-label {
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .count { font-size: 11px; color: rgba(255,255,255,0.3); }

    /* Typography */
    .font-specimen {
      margin-bottom: 20px;
      padding: 16px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 8px;
    }
    .specimen-text {
      font-size: 20px;
      color: var(--text-h);
      margin-bottom: 8px;
      word-break: break-all;
    }
    .type-row {
      display: flex;
      align-items: baseline;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border);
    }
    .type-sample { color: var(--text-h); flex: 1; }

    /* Spacing */
    .spacing-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 6px 0;
    }
    .spacing-bar {
      height: 16px;
      background: var(--accent);
      border-radius: 3px;
      opacity: 0.7;
      min-width: 4px;
    }

    /* Radius */
    .radius-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
    .radius-box-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .radius-box {
      width: 64px;
      height: 64px;
      background: var(--accent-dim);
      border: 2px solid var(--accent);
    }

    /* Shadows */
    .shadow-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 20px;
    }
    .shadow-card {
      background: var(--surface);
      border-radius: 8px;
      padding: 24px 16px;
      border: 1px solid var(--border);
    }

    /* Components */
    .component-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .component-chip {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 100px;
    }
    .component-name { color: var(--text-h); font-size: 13px; }
    .component-source {
      font-size: 10px;
      color: rgba(255,255,255,0.3);
      font-family: var(--mono);
    }

    /* Lists */
    ul.token-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    /* Utilities */
    code {
      font-family: var(--mono);
      font-size: 12px;
      background: rgba(255,255,255,0.06);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--text-h);
      word-break: break-all;
    }
    .muted { color: rgba(255,255,255,0.3); font-size: 13px; }
    .meta {
      font-size: 12px;
      color: rgba(255,255,255,0.3);
      margin-bottom: 32px;
    }
    .meta a { color: var(--accent); text-decoration: none; }
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    @media (max-width: 700px) {
      main { padding: 24px 16px; margin-left: 0; }
      nav { display: none; }
      .two-col { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>

<nav>
  <div class="nav-logo">
    <a href="${sourceUrl}" target="_blank" rel="noopener">↗ ${new URL(sourceUrl).hostname}</a>
  </div>
  <span class="nav-label">Foundations</span>
  <a href="#colors">Colors</a>
  <a href="#typography">Typography</a>
  <a href="#spacing">Spacing</a>
  <a href="#radius">Border Radius</a>
  <a href="#shadows">Shadows</a>
  <span class="nav-label">Patterns</span>
  <a href="#animations">Animations</a>
  <a href="#layout">Layout</a>
  <a href="#components">Components</a>
</nav>

<main>
  <h2 class="section-title">Design System</h2>
  <h3 class="group-title" style="border:none;padding:0;margin-bottom:8px;font-size:28px">${new URL(sourceUrl).hostname}</h3>
  <p class="meta">Extracted from <a href="${sourceUrl}" target="_blank" rel="noopener">${sourceUrl}</a></p>

  <!-- COLORS -->
  <section id="colors">
    <h2 class="section-title">Foundations</h2>
    <h3 class="group-title">Colors</h3>
    <h4 class="sub-title">Hex (${topHexColors.length} most frequent)</h4>
    <div class="swatch-grid">${colorSwatches(topHexColors)}</div>
    ${topRgbaColors.length ? `<h4 class="sub-title" style="margin-top:24px">RGBA (${topRgbaColors.length} most frequent)</h4><div class="swatch-grid">${colorSwatches(topRgbaColors)}</div>` : ''}
  </section>

  <!-- TYPOGRAPHY -->
  <section id="typography">
    <h2 class="section-title">Foundations</h2>
    <h3 class="group-title">Typography</h3>
    ${fontFamilySpecimens ? `<h4 class="sub-title">Font Families</h4>${fontFamilySpecimens}` : ''}
    ${typographyRows ? `<h4 class="sub-title">Type Scale</h4><div>${typographyRows}</div>` : '<p class="muted">No font-size declarations found.</p>'}
    <div class="two-col" style="margin-top:24px">
      <div class="card">
        <h4 class="sub-title" style="margin-top:0">Weights</h4>
        <ul class="token-list">${typography.weights.map((w) => `<li><code>${w}</code></li>`).join('')}</ul>
      </div>
      <div class="card">
        <h4 class="sub-title" style="margin-top:0">Letter Spacing</h4>
        <ul class="token-list">${typography.letterSpacings.map((l) => `<li><code>${l}</code></li>`).join('')}</ul>
      </div>
    </div>
    ${typography.googleFontsUrl ? `<p style="margin-top:16px;font-size:12px">Google Fonts: <a href="${typography.googleFontsUrl}" target="_blank" style="color:var(--accent)">${typography.googleFontsUrl}</a></p>` : ''}
  </section>

  <!-- SPACING -->
  <section id="spacing">
    <h2 class="section-title">Foundations</h2>
    <h3 class="group-title">Spacing Scale</h3>
    ${spacingBars || '<p class="muted">No spacing values found.</p>'}
  </section>

  <!-- RADIUS -->
  <section id="radius">
    <h2 class="section-title">Foundations</h2>
    <h3 class="group-title">Border Radius</h3>
    <div class="radius-grid">${radiusBoxes || '<p class="muted">No border-radius values found.</p>'}</div>
  </section>

  <!-- SHADOWS -->
  <section id="shadows">
    <h2 class="section-title">Foundations</h2>
    <h3 class="group-title">Shadows & Effects</h3>
    <div class="shadow-grid">${shadowCards || '<p class="muted">No box-shadow values found.</p>'}</div>
  </section>

  <!-- ANIMATIONS -->
  <section id="animations">
    <h2 class="section-title">Patterns</h2>
    <h3 class="group-title">Animations & Transitions</h3>
    <div class="two-col">
      <div class="card">
        <h4 class="sub-title" style="margin-top:0">Transitions</h4>
        <ul class="token-list">${transitionList || '<li class="muted">None found</li>'}</ul>
      </div>
      <div class="card">
        <h4 class="sub-title" style="margin-top:0">Animations</h4>
        <ul class="token-list">${animationList || '<li class="muted">None found</li>'}</ul>
      </div>
    </div>
  </section>

  <!-- LAYOUT -->
  <section id="layout">
    <h2 class="section-title">Patterns</h2>
    <h3 class="group-title">Layout</h3>
    <div class="two-col">
      <div class="card">
        <h4 class="sub-title" style="margin-top:0">Max Widths</h4>
        <ul class="token-list">${maxWidthList || '<li class="muted">None found</li>'}</ul>
      </div>
      <div class="card">
        <h4 class="sub-title" style="margin-top:0">Grid Columns</h4>
        <ul class="token-list">${gridList || '<li class="muted">None found</li>'}</ul>
      </div>
    </div>
    ${layout.breakpoints.length ? `<h4 class="sub-title">Breakpoints</h4><ul class="token-list">${layout.breakpoints.slice(0, 8).map((b) => `<li><code>${b}</code></li>`).join('')}</ul>` : ''}
  </section>

  <!-- COMPONENTS -->
  <section id="components">
    <h2 class="section-title">Patterns</h2>
    <h3 class="group-title">Detected Components</h3>
    <div class="component-grid">${componentList}</div>
  </section>
</main>

<script>
  // Scroll-spy
  const navLinks = document.querySelectorAll('nav a[href^="#"]');
  const sections = document.querySelectorAll('section[id]');

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          navLinks.forEach((a) => a.classList.remove('active'));
          const active = document.querySelector('nav a[href="#' + entry.target.id + '"]');
          if (active) active.classList.add('active');
        }
      }
    },
    { rootMargin: '-20% 0px -70% 0px' },
  );
  sections.forEach((s) => observer.observe(s));

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
    { threshold: 0.08 },
  );
  sections.forEach((s) => fadeObserver.observe(s));

  // Smooth scroll
  document.querySelectorAll('nav a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
    });
  });
</script>
</body>
</html>`;
}
