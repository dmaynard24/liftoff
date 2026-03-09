## Website-to-Styleguide Playbook

A sequential, repeatable process for converting any website into a comprehensive design system styleguide. Follow every step in order.

**Note:** This playbook is designed to be flexible. Different websites have different structures, frameworks, and patterns. Adapt the extraction commands and techniques based on what you find in the source HTML. If a specific pattern mentioned here doesn't exist on your target site, use manual inspection and browser dev tools to identify equivalent structures.

### Step 0: Setup

Create a new `ideas/idea{#}/` directory for the output. All files go here.

### Step 1: Capture Visual Reference Screenshots

Use the `capture-screenshots.mjs` script to take full-page screenshots at desktop (1440px) viewport. The script auto-discovers subpages and captures them all.

```bash
node ideas/capture-screenshots.mjs <URL> ideas/idea{#}
```

Screenshots are saved to `ideas/idea{#}/screenshots/` as `ref-{page}.png`. These serve as the visual reference throughout the entire process — especially critical for verifying Molecules and Organisms in Step 9.

### Step 2: Save the Full Source HTML

Websites vary in how they load content and styles. Some inline everything in the initial HTML response, while others load CSS/JS files dynamically. Save the full source for analysis:

```bash
curl -s '<URL>' -o /tmp/source.html
```

**Note:** If the site uses client-side rendering (SPA), you may need to use browser automation tools like Puppeteer to get the fully rendered HTML after JavaScript execution. The capture-screenshots.mjs script already handles this for screenshots.

This file will be grepped many times — for text content, design tokens, component names, class styles, SVG icons, and animation configurations.

### Step 3: Extract Text Content

Strip tags from the saved source to extract visible text:

```bash
cat /tmp/source.html | sed 's/<[^>]*>//g' | sed '/^$/d' | sed 's/^[[:space:]]*//' | grep -v '^[{}]' | grep -v '^var ' | grep -v '^function' | grep -v '^\.' | grep -E '[A-Za-z]{3,}' | head -200
```

**What to capture:**
- All heading text (H1–H6 content)
- Body copy, descriptions, CTAs
- Navigation labels
- Footer content, social links
- Section names and labels
- Any stats, testimonials, or quoted text

**Save these as reference notes** — you'll need exact wording for the styleguide specimens.

### Step 4: Extract Design Tokens — Colors

```bash
# Extract all hex colors with frequency
cat /tmp/source.html | grep -oE '#[0-9a-fA-F]{3,8}' | sort | uniq -c | sort -rn
```

```bash
# Extract rgb/rgba colors with frequency
cat /tmp/source.html | grep -oE 'rgba?\([0-9, .]+\)' | sort | uniq -c | sort -rn
```

**Organize into categories:**
- **Backgrounds:** Page bg, section bg, card bg, input bg
- **Text:** Primary, secondary/muted, disabled
- **Borders:** Default, hover, focus
- **Accent:** Primary action color, links, highlights
- **Semantic:** Success (green), warning (yellow), error (red), info (blue)
- **Opacity variants:** Any semi-transparent overlays or gradients

### Step 5: Extract Design Tokens — Typography

```bash
cat /tmp/source.html | grep -oE 'font-family:[^;"]+' | sort -u
cat /tmp/source.html | grep -oE 'font-size:[^;"]+' | sort -u
cat /tmp/source.html | grep -oE 'font-weight:[^;"]+' | sort -u
cat /tmp/source.html | grep -oE 'line-height:[^;"]+' | sort -u
cat /tmp/source.html | grep -oE 'letter-spacing:[^;"]+' | sort -u
```

**Extract font preset definitions** — these contain the complete type scale with exact values. Look for CSS classes that define typography styles:

```bash
# Find all style preset class names (patterns vary by site)
grep -oE 'styles-preset-[a-z0-9]+|text-style-[a-z0-9]+|typography-[a-z0-9]+' /tmp/source.html | sort -u

# Extract full preset definitions (font-family, size, weight, letter-spacing, line-height, color)
grep -oE '\.(styles-preset|text-style|typography)-[a-z0-9]+[^}]*\{[^}]+\}' /tmp/source.html
```

Font sizes may use various patterns. Look for:
- `calc(var(--root-font-size, 1rem) * N)` (common in some frameworks)
- Direct rem/em values
- px values that form a scale

Extract the multipliers or absolute values and organize into a type scale (label, body, h5, h4, h3, h2, display, stat).

**Identify font sources:**

```bash
# Google Fonts
cat /tmp/source.html | grep -oE 'fonts\.googleapis\.com/css2[^"'"'"']*' | head -5

# Hosted fonts (@font-face declarations)
grep -oE '@font-face[^}]+\}' /tmp/source.html | head -10
```

### Step 6: Extract Design Tokens — Spacing, Radius, Shadows

```bash
cat /tmp/source.html | grep -oE 'border-radius:[^;"]+' | sort -u
cat /tmp/source.html | grep -oE 'box-shadow:[^;"]+' | sort -u
cat /tmp/source.html | grep -oE 'padding:[^;"]+' | sort -u
cat /tmp/source.html | grep -oE 'gap:[^;"]+' | sort -u
```

**Derive the spacing scale** — look for repeating values (4, 6, 8, 10, 12, 16, 20, 24, 32, 48, 80, 120, 180 are common). Build a 10–14 step scale from the extracted padding/gap/margin values.

### Step 7: Extract Animation & Interaction Patterns

```bash
cat /tmp/source.html | grep -oE 'transition:[^;"]+' | sort -u
cat /tmp/source.html | grep -oE 'transform:[^;"]+' | sort -u
cat /tmp/source.html | grep -oE 'animation:[^;"]+' | sort -u
```

**Also extract animation configurations** — look for JSON objects or CSS that define entrance animations:

```bash
# Look for animation configuration objects (patterns vary by site)
grep -oE '"(initial|animate|entrance)":\{[^}]+\}' /tmp/source.html | head -5
grep -oE '"(from|to|keyframes)":\{[^}]+\}' /tmp/source.html | head -5
```

If no JSON configs are found, inspect the CSS for animation keyframes and transition properties.

**Document:**
- Entrance animation (fade direction, distance, duration, easing cubic-bezier)
- Hover states (scale, translateY, shadow changes, color transitions)
- Scroll-trigger behavior (Intersection Observer threshold)
- Header behavior (sticky, hide-on-scroll, blur backdrop)
- Transition timing (duration in ms, easing curve name or cubic-bezier)

### Step 8: Extract Layout & Component Structure

```bash
cat /tmp/source.html | grep -oE 'max-width:[^;"]+' | sort -u
cat /tmp/source.html | grep -oE 'grid-template-columns:[^;"]+' | sort -u
```

**Extract all named components** — these reveal the site's component hierarchy. Look for data attributes or class patterns that indicate component names:

```bash
# Common patterns for component identification
grep -oE 'data-(component|element|block)-name="[^"]*"' /tmp/source.html | sort -u
grep -oE 'data-component="[^"]*"' /tmp/source.html | sort -u
# Or look for semantic class patterns
grep -oE 'class="[^"]*component[^"]*"' /tmp/source.html | sort -u
```

**Extract key component DOM fragments and CSS** for use in Step 11 (Molecules & Organisms):

```bash
# Find button styles (adjust component names based on what you found above) (adjust component names based on what you found above)
grep -oE 'data-component-name="Button Fill"[^>]*style="[^"]*"' /tmp/source.html

# Find card/section structures by their visible text
grep -oE 'class="[^"]*"[^>]*>[^<]*VISIBLE_TEXT' /tmp/source.html

# Find inline SVG icons
grep -oE '<svg[^>]*viewBox="[^"]*"[^>]*>.*?</svg>' /tmp/source.html
```

**Document:**
- Content max-width (typically 1000–1800px)
- Narrow content width (typically 600–800px for text)
- Grid layouts (column counts per breakpoint)
- Section padding (vertical rhythm between sections)
- Responsive breakpoints (look for `@media` queries)

### Step 9: Visit Subpages

Review the screenshots from Step 1 for every subpage template. Use `curl` to fetch subpage sources only if they introduce new components not found on the homepage.

Common subpages:
- Project/case study detail page (`/projects/*`, `/work/*`, `/portfolio/*`)
- Blog/newsroom article page
- About page
- Contact page

Each subpage may introduce new components (breadcrumbs, content blocks, code blocks, image galleries, detail metadata grids) not present on the homepage. Capture their tokens and DOM structure too.

### Step 10: Compile the Token Sheet

Before writing any HTML, compile all extracted values into `tokens.md`:

```
COLORS:        [list all with categories]
FONTS:         [families + weights + CDN/hosted links]
TYPE SCALE:    [name, element, family, size multiplier, weight, letter-spacing, line-height]
SPACING:       [numbered scale from smallest to largest]
BORDER RADIUS: [all values with semantic names]
SHADOWS:       [all values with semantic names]
ANIMATIONS:    [entrance specs from animation configs, hover, scroll, header behaviors]
LAYOUT:        [max-widths, grids per breakpoint, section padding, responsive breakpoints]
```

This token sheet becomes the CSS custom properties block at the top of `styleguide.html`.

### Step 11: Build the Styleguide

Create `styleguide.html` — a comprehensive design system documentation page.

**Use Atomic Design methodology with these exact sections:**

#### Foundations
- **Colors:** Render every color as a swatch card showing hex value, CSS variable name, and a visual preview. Group by category (core, text, accent, decorative, borders/opacity).
- **Typography:** Show each font family as a specimen (full alphabet + numbers). Render the complete type scale with live text samples showing name, size (rem multiplier), weight, letter-spacing, line-height, and CSS variable.
- **Spacing:** Render each step as a labeled horizontal bar at actual pixel width.
- **Border Radius:** Show each radius value applied to a sample box.
- **Shadows & Effects:** Show each shadow/effect on a sample card.

#### Atoms
- **Buttons:** All variants (primary, secondary/ghost, accent) × all sizes (sm, md, lg). Include icon variants with SVGs extracted from source. Show disabled state. Note the exact source styles (e.g., "from source: bg rgba(255,255,255,0.15), radius 50px").
- **Tags/Badges:** Default + semantic color variants. Small variant if applicable.
- **Status Indicators:** Dot badges with color (green/yellow/red).
- **Form Inputs:** Text, email, textarea. Show default, focus, error, and disabled states. Include labels, hint text, and error messages.
- **Avatars:** All sizes used on the site.
- **Dividers:** Horizontal rules matching the site's border style.

#### Molecules & Organisms — Pixel-Perfect from Source

**IMPORTANT:** Foundations and Atoms can be built from extracted tokens alone. Molecules and Organisms cannot — they are multi-element compositions where spacing, nesting, and alignment must match the original exactly. Take extra time on these. Study the source HTML and the reference screenshots carefully before writing any code.

**Process for each molecule/organism:**

1. **Extract the actual DOM structure** from the saved source. The website inlines all content, so the HTML tree for every component is in the source. Isolate the relevant fragment:

```bash
# Search for a component by its visible text to find its DOM tree
grep -o '<div[^>]*>.*Card Title.*</div>' /tmp/source.html | head -5

# Find components by their name
grep -oE 'data-component-name="Footer"' /tmp/source.html
```

2. **Extract the component's CSS** — Websites use hashed class names (e.g., `.site-1a2b3c`). Find the classes on the component's DOM nodes, then pull their style rules:

```bash
# Find styles for a specific class
grep -oE '\.site-[a-z0-9]+\{[^}]+\}' /tmp/source.html | grep 'site-1a2b3c'
```

3. **Extract inline SVG icons** used by the component (arrows, corner decorations, logos):

```bash
# Find SVG templates at the bottom of the source
grep -oE '<svg[^>]*id="[^"]*"[^>]*>.*?</svg>' /tmp/source.html
```

4. **Translate, don't invent.** Map the website DOM and styles to clean semantic HTML, but preserve the exact values:
   - Keep the same nesting depth and flex/grid relationships
   - Use the exact `padding`, `gap`, `border-radius`, and `font-size` values from the source — don't round or substitute token aliases that are "close enough"
   - Preserve the same `position`, `overflow`, and `z-index` stacking behavior
   - Match `aspect-ratio` or explicit `width`/`height` on image containers
   - Include hover/focus state styling (inspect `:hover` rules in the source CSS)

5. **Cross-reference with the screenshot.** After writing the HTML, visually compare your specimen against the `ref-*.png` screenshot. Check:
   - Internal spacing between child elements
   - Text alignment (left vs center vs justified)
   - Border thickness and color (often `1px solid rgba(255,255,255,0.06)` — not solid white)
   - Whether the component has a background or is transparent
   - SVG icon sizes and colors

6. **Add source notes.** Each molecule/organism specimen should include a brief note describing what was extracted from the source (e.g., "From source: flex column, bg rgba(3,3,3,0.2), backdrop-filter blur(10px), gap 32px").

#### Molecules
- **Every card type** found on the site (project card, stat card, feature card, testimonial card, value card, news card, etc.) — render as a live, interactive specimen with hover states. Match the source DOM structure.
- **Content blocks** from subpages (code blocks with syntax highlighting, blockquotes, timeline items, metadata grids, etc.)

#### Organisms
- **Header:** Full header as it appears on the site, with navigation and any CTAs. Extract the exact nav structure, icon sizes, spacing, and backdrop-filter from source.
- **Hero Section:** Full hero with label, display title (including italic accent font if used), description, and CTA buttons.
- **Footer:** Full footer with all link columns and bottom bar. Match the grid/flex layout from source.
- **Full page sections:** For any section that combines multiple molecules (e.g., a stats marquee, a pricing section with cards + heading), extract and replicate the section-level layout — the container max-width, the gap between heading and cards, the vertical padding.
- **Animation Reference:** Document entrance animation specs (distance, duration, easing, stagger) from the animation configs, hover specs, and scroll-trigger settings. Show an interactive demo with a replay button.

**Styleguide page requirements:**
- Fixed left sidebar with section navigation
- Scroll-spy highlighting (Intersection Observer on each section)
- Smooth scroll behavior
- **Reference link:** The sidebar logo/title must link back to the original website URL (opens in new tab)
- Every component is a **live rendered specimen** (not a screenshot or mockup)
- All hover/focus/active states are functional
- Fade-up animations on scroll with `prefers-reduced-motion` support
- Uses the exact same CSS custom properties as the token sheet
