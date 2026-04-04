# Liftoff — Website-to-Styleguide App

## Status: Generator needs major upgrade to reach parity with ideas/idea1/styleguide.html

---

## Context

The pipeline architecture is correct and working. The gap is almost entirely in `generator.ts` and partially in `tokens.ts`. The current output is a minimal utility doc; idea1/styleguide.html is a rich, interactive design system showcase. The changes below are scoped to those two files.

---

## Tech Stack (unchanged)

- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4 → Netlify (`liftoff.davemaynard.dev`)
- **Backend:** Bun + Hono + TypeScript + Playwright → Fly.io (`liftoff-api.fly.dev`)
- **Transport:** SSE for real-time step progress

---

## Repo Structure (as built)

```
liftoff/
  apps/
    web/
      src/
        App.tsx                 # 3-state UI: input → progress → result
        index.css               # @import "tailwindcss"
      vite.config.ts            # Tailwind v4, /api proxy to :3000
      netlify.toml
    api/
      src/
        index.ts                # Hono server, SSE route, CORS
        extractor/
          fetch.ts              # Playwright: fetchRenderedHTML(url) → string
          tokens.ts             # ← needs CSS variable extraction
          components.ts         # extractComponentNames(html) → ComponentInfo[]
          generator.ts          # ← needs complete rewrite
          pipeline.ts           # Orchestrates steps, yields SSE events
      Dockerfile
      fly.toml
  package.json                  # Bun workspace + dev scripts
```

---

## What needs to change

### 1. `tokens.ts` — add CSS variable extraction

CSS custom properties on `:root` are the most valuable token source: they give us **named** colors (e.g. `--blue: #09f`, `--success: #4ade80`) instead of anonymous hex values sorted by frequency. This is the single biggest quality improvement.

Add to `tokens.ts`:
```ts
export interface CSSVar { name: string; value: string }

export function extractCSSVars(html: string): CSSVar[]
// Regex: /(--[\w-]+)\s*:\s*([^;}\n]+)/g inside :root blocks
// Returns e.g. [{ name: '--blue', value: '#09f' }, { name: '--success', value: '#4ade80' }]
```

Also extract:
- `extractGoogleFontsLinks(html)` → all `<link>` hrefs matching fonts.googleapis.com (for `<link rel="preconnect">` in the output)
- `extractButtonStyles(html)` → inline styles on `<button>` or `[class*="btn"]` elements, to inform atom specimens

Update `Tokens` interface and `extractAllTokens` to include `cssVars: CSSVar[]`.

---

### 2. `generator.ts` — complete rewrite to match idea1 quality

#### Layout: sticky header, not sidebar

Replace the fixed sidebar with a sticky top header (idea1 pattern):
```html
<header class="sg-header">
  <div class="sg-header-title">
    <a href="{sourceUrl}" target="_blank">{hostname}</a>
    <span>Design System</span>
  </div>
  <nav class="sg-nav">
    <a href="#foundations">Foundations</a>
    <a href="#atoms">Atoms</a>
    <a href="#layout">Layout</a>
    <a href="#animations">Animations</a>
  </nav>
</header>
<main class="sg-page">...</main>
```

#### CSS custom properties: use extracted vars, not hardcoded styleguide colors

The styleguide's own UI (`--bg`, `--surface`, `--border`, `--text`, etc.) stays hardcoded dark. But the **color swatches** and **atom specimens** should use the site's extracted `cssVars` as the source of truth for naming.

#### Section structure (match idea1 exactly)

Every section follows this shape:
```html
<section class="sg-section" id="...">
  <p class="sg-section-label">Foundations</p>    <!-- mono, uppercase, accent color -->
  <h2 class="sg-section-title">Colors</h2>
  <p class="sg-section-desc">...</p>             <!-- 1-sentence description -->
  <div class="sg-sub">
    <h3 class="sg-sub-title">Core</h3>           <!-- ::after rule draws the divider line -->
    ...specimens...
  </div>
</section>
```

#### Color swatches (upgrade)

- 80px preview height (up from 60px)
- Two-part card: `.color-swatch-preview` + `.color-swatch-info` (separate bg)
- Display CSS var name when available (from `cssVars`), raw hex/rgba otherwise
- Group into subsections: **Core** (hex, top 20), **Opacity / RGBA** (top 10)

#### Type scale (upgrade)

- `.type-meta` column (min-width 120px, flex-shrink: 0) showing size + weight on two lines
- `.type-sample` on the right, rendered at actual `font-size` value
- `border-bottom: 1px solid var(--border)` on each row, removed on `:last-child`

#### Spacing bars (upgrade)

- 24px height (up from 16px)
- `background: rgba(0, 153, 255, 0.2)`, `border: 1px solid rgba(0, 153, 255, 0.4)` — matches idea1 exactly
- Right-aligned label with `min-width: 60px`

#### Radius items (upgrade)

- `border: 1px solid var(--white-25)` semi-transparent border (not accent-colored)
- `background: var(--bg-card)` fill

#### Shadow items (upgrade)

- Shadow applied to a blank preview box (not the card itself)
- Separate `.shadow-label-name` (13px bold) + `.shadow-label-val` (11px mono) below

#### Atoms section — NEW

Generate a full Atoms section with live specimens built from extracted tokens. Use sensible defaults for anything not extractable:

**Buttons** — three variants × three sizes + disabled:
```html
<div class="sg-sub">
  <h3 class="sg-sub-title">Buttons</h3>
  <div class="sg-card"><div class="sg-card-body sg-flex">
    <button class="btn btn-primary btn-lg">Primary</button>
    <button class="btn btn-ghost btn-lg">Ghost</button>
    <button class="btn btn-primary btn-md">Medium</button>
    <button class="btn btn-primary btn-sm">Small</button>
    <button class="btn btn-primary btn-md" disabled>Disabled</button>
  </div><div class="sg-card-footer">btn · btn-primary / btn-ghost · btn-sm / btn-md / btn-lg</div></div>
</div>
```
The `.btn*` CSS is written into the `<style>` block using values derived from the site's extracted tokens (border-radius from `radius[0]`, transition from `animations.transitions[0]`, primary color from top hex color).

**Tags** — default + semantic color variants:
```html
<span class="tag">Default</span>
<span class="tag tag-blue"><span class="tag-dot"></span>Active</span>
<span class="tag tag-green"><span class="tag-dot"></span>Success</span>
<span class="tag tag-yellow"><span class="tag-dot"></span>Warning</span>
<span class="tag tag-red"><span class="tag-dot"></span>Error</span>
```

**Form inputs** — default, focus (`:focus` demo via JS class toggle), error, disabled:
```html
<input class="input" placeholder="Default input" />
<input class="input" placeholder="Focus state (click me)" />
<input class="input input-error" value="Error state" />
<input class="input" placeholder="Disabled" disabled />
<textarea class="textarea" placeholder="Textarea"></textarea>
```

**Avatars** — three sizes with gradient:
```html
<div class="avatar avatar-lg">DM</div>
<div class="avatar avatar-md">DM</div>
<div class="avatar avatar-sm">DM</div>
```
Colors derived from top hex accent color.

**Divider:**
```html
<hr class="divider" />
```
Using `border-color` from extracted border color or `rgba(255,255,255,0.08)`.

#### Grid helpers to add to `<style>`

```css
.sg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.sg-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
.sg-grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 24px; }
.sg-flex    { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
```

#### CSS vars section — NEW

If `cssVars` is non-empty, render a dedicated **CSS Variables** subsection inside Foundations showing all extracted custom properties as a two-column code list.

#### Easing / animation section (upgrade)

Render a live easing curve demo for each extracted `cubic-bezier(...)` value using a small CSS animation preview box.

---

### 3. Pipeline step labels (minor)

Update step 3 label from "Extracting spacing, radius & shadows" to "Extracting spacing, radius, shadows & CSS vars" to reflect the new extraction.

---

## Implementation order

1. **`tokens.ts`** — add `extractCSSVars`, update `Tokens` type and `extractAllTokens`
2. **`generator.ts`** — full rewrite top-to-bottom matching idea1 structure and CSS patterns
3. **`pipeline.ts`** — update step 3 label

---

## Deployment checklist (unchanged)

### Local verification
- [ ] `cd apps/api && bunx playwright install chromium` (one-time)
- [ ] `bun run dev` from root
- [ ] Submit a URL, confirm 9-step SSE stream, result link opens styleguide
- [ ] Visually compare output against idea1/styleguide.html

### Fly.io (API)
- [ ] `cd apps/api && fly launch` — app: `liftoff-api`, region: `iad`
- [ ] `fly deploy` for subsequent pushes

### Netlify (Frontend)
- [ ] New site, base dir `apps/web`, build `bun run build`, publish `dist`
- [ ] Env var: `VITE_API_URL=https://liftoff-api.fly.dev`
- [ ] CNAME `liftoff` → Netlify site in davemaynard.dev DNS

### Cleanup
- [ ] Delete `capture-screenshots.mjs` from repo root

---

## Future work (not built)
- Job TTL / cleanup of `$TMPDIR/liftoff-jobs/` after N hours
- Download button for the styleguide HTML
- Rate limiting on `/api/extract`
- AI-assisted token categorization and component inference (v2)
