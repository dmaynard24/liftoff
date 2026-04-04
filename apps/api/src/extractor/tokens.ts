export interface ColorToken {
  value: string;
  count: number;
}

export interface ColorPalette {
  chromatic: ColorToken[];
  grayscale: ColorToken[];
  rgba: ColorToken[];
}

export interface TypographyTokens {
  families: string[];
  sizes: string[];
  weights: string[];
  lineHeights: string[];
  letterSpacings: string[];
  googleFontsUrl: string | null;
}

export interface CSSVar {
  name: string;
  value: string;
}

export interface Tokens {
  colors: ColorPalette;
  cssVars: CSSVar[];
  typography: TypographyTokens;
  spacing: string[];
  radius: string[];
  shadows: string[];
  animations: { transitions: string[]; transforms: string[]; animations: string[] };
  layout: { maxWidths: string[]; gridColumns: string[]; breakpoints: string[] };
}

// ─── Hex color utilities ──────────────────────────────────────────────────────

function normalizeHex(hex: string): string {
  const h = hex.replace('#', '').toLowerCase();
  if (h.length === 3) return '#' + h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length === 6) return '#' + h;
  if (h.length === 8) return '#' + h.slice(0, 6); // strip alpha channel
  return hex.toLowerCase();
}

function parseRGB(hex: string): [number, number, number] {
  const h = normalizeHex(hex).replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance(hex: string): number {
  const [r, g, b] = parseRGB(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function isGrayscale(hex: string): boolean {
  try {
    const [r, g, b] = parseRGB(hex);
    return Math.max(r, g, b) - Math.min(r, g, b) < 20;
  } catch {
    return false;
  }
}

// Remove grayscale colors within 15 luminance units of an already-kept color.
// For chromatic colors just deduplicate by normalized value.
function deduplicateGrayscale(tokens: ColorToken[]): ColorToken[] {
  const kept: ColorToken[] = [];
  for (const token of tokens) {
    try {
      const lum = luminance(token.value);
      const tooClose = kept.some((k) => Math.abs(luminance(k.value) - lum) < 15);
      if (!tooClose) kept.push(token);
    } catch {
      // skip unparseable
    }
  }
  return kept;
}

// ─── Color extraction ─────────────────────────────────────────────────────────

const MAX_CHROMATIC = 12;
const MAX_GRAYSCALE = 8;
const MAX_RGBA = 8;
const MIN_COUNT = 2; // ignore colors that appear only once (likely content-specific)

export function extractColors(html: string): ColorPalette {
  // Collect all hex matches and normalize them
  const raw = (html.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).filter(
    (h) => h.length === 4 || h.length === 7 || h.length === 9,
  );

  // Count by normalized value
  const map = new Map<string, number>();
  for (const h of raw) {
    const key = normalizeHex(h);
    map.set(key, (map.get(key) ?? 0) + 1);
  }

  // Filter by minimum frequency and sort by count desc
  const all: ColorToken[] = [...map.entries()]
    .filter(([, count]) => count >= MIN_COUNT)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);

  const chromaticRaw = all.filter((t) => !isGrayscale(t.value)).slice(0, MAX_CHROMATIC);
  const grayscaleRaw = deduplicateGrayscale(
    all.filter((t) => isGrayscale(t.value)),
  ).slice(0, MAX_GRAYSCALE);

  // RGBA — count as-is, cap, filter single-use
  const rgbaRaw = html.match(/rgba?\([0-9, .%]+\)/g) ?? [];
  const rgbaMap = new Map<string, number>();
  for (const r of rgbaRaw) {
    const key = r.trim();
    rgbaMap.set(key, (rgbaMap.get(key) ?? 0) + 1);
  }
  const rgba: ColorToken[] = [...rgbaMap.entries()]
    .filter(([, count]) => count >= MIN_COUNT)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_RGBA);

  return { chromatic: chromaticRaw, grayscale: grayscaleRaw, rgba };
}

// ─── CSS custom property extraction ───────────────────────────────────────────

export function extractCSSVars(html: string): CSSVar[] {
  const vars: CSSVar[] = [];
  const seen = new Set<string>();
  for (const m of html.matchAll(/(--[\w-]+)\s*:\s*([^;}\n]{1,80})/g)) {
    const name = m[1].trim();
    const value = m[2].trim();
    if (!seen.has(name) && value.length > 0) {
      seen.add(name);
      vars.push({ name, value });
    }
  }
  return vars;
}

// ─── Typography ───────────────────────────────────────────────────────────────

function unique(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()))].filter(Boolean);
}

export function extractTypography(html: string): TypographyTokens {
  const families = unique(
    (html.match(/font-family:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('font-family:', '').trim()),
  );
  const sizes = unique(
    (html.match(/font-size:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('font-size:', '').trim()),
  );
  const weights = unique(
    (html.match(/font-weight:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('font-weight:', '').trim()),
  );
  const lineHeights = unique(
    (html.match(/line-height:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('line-height:', '').trim()),
  );
  const letterSpacings = unique(
    (html.match(/letter-spacing:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('letter-spacing:', '').trim()),
  );

  const gfMatch = html.match(/fonts\.googleapis\.com\/css2[^"']*/);
  const googleFontsUrl = gfMatch ? `https://${gfMatch[0]}` : null;

  return { families, sizes, weights, lineHeights, letterSpacings, googleFontsUrl };
}

// ─── Spacing ──────────────────────────────────────────────────────────────────

export function extractSpacing(html: string): string[] {
  const padding = (html.match(/padding:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('padding:', '').trim());
  const gap = (html.match(/gap:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('gap:', '').trim());
  const margin = (html.match(/margin:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('margin:', '').trim());

  const allValues = [...padding, ...gap, ...margin].join(' ');
  const nums = allValues.match(/\d+(?:\.\d+)?(?:px|rem|em)/g) ?? [];
  return unique(nums).sort((a, b) => {
    const toNum = (v: string) => parseFloat(v) * (v.includes('rem') ? 16 : 1);
    return toNum(a) - toNum(b);
  });
}

// ─── Radius, shadows, animations, layout ──────────────────────────────────────

export function extractRadius(html: string): string[] {
  return unique(
    (html.match(/border-radius:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('border-radius:', '').trim()),
  );
}

export function extractShadows(html: string): string[] {
  return unique(
    (html.match(/box-shadow:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('box-shadow:', '').trim()),
  );
}

export function extractAnimations(html: string): Tokens['animations'] {
  const transitions = unique(
    (html.match(/transition:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('transition:', '').trim()),
  );
  const transforms = unique(
    (html.match(/transform:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('transform:', '').trim()),
  );
  const animations = unique(
    (html.match(/animation:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('animation:', '').trim()),
  );
  return { transitions, transforms, animations };
}

export function extractLayout(html: string): Tokens['layout'] {
  const maxWidths = unique(
    (html.match(/max-width:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('max-width:', '').trim()),
  );
  const gridColumns = unique(
    (html.match(/grid-template-columns:\s*([^;"}{]+)/g) ?? []).map((s) =>
      s.replace('grid-template-columns:', '').trim(),
    ),
  );
  const breakpoints = unique(
    (html.match(/@media[^{]+\{/g) ?? []).map((s) => s.replace('@media', '').replace('{', '').trim()),
  );
  return { maxWidths, gridColumns, breakpoints };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function extractAllTokens(html: string): Tokens {
  return {
    colors: extractColors(html),
    cssVars: extractCSSVars(html),
    typography: extractTypography(html),
    spacing: extractSpacing(html),
    radius: extractRadius(html),
    shadows: extractShadows(html),
    animations: extractAnimations(html),
    layout: extractLayout(html),
  };
}
