export interface ColorToken {
  value: string;
  count: number;
}

export interface TypographyTokens {
  families: string[];
  sizes: string[];
  weights: string[];
  lineHeights: string[];
  letterSpacings: string[];
  googleFontsUrl: string | null;
}

export interface Tokens {
  colors: { hex: ColorToken[]; rgba: ColorToken[] };
  typography: TypographyTokens;
  spacing: string[];
  radius: string[];
  shadows: string[];
  animations: { transitions: string[]; transforms: string[]; animations: string[] };
  layout: { maxWidths: string[]; gridColumns: string[]; breakpoints: string[] };
}

function countMatches(matches: string[]): ColorToken[] {
  const map = new Map<string, number>();
  for (const m of matches) {
    const key = m.trim();
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
}

function unique(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()))].filter(Boolean);
}

export function extractColors(html: string): Tokens['colors'] {
  const hex = (html.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).filter(
    (h) => h.length === 4 || h.length === 7 || h.length === 9,
  );
  const rgba = html.match(/rgba?\([0-9, .%]+\)/g) ?? [];
  return { hex: countMatches(hex), rgba: countMatches(rgba) };
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

export function extractSpacing(html: string): string[] {
  const padding = (html.match(/padding:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('padding:', '').trim());
  const gap = (html.match(/gap:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('gap:', '').trim());
  const margin = (html.match(/margin:\s*([^;"}{]+)/g) ?? []).map((s) => s.replace('margin:', '').trim());

  // Extract individual numeric values (px, rem, em) and build a sorted scale
  const allValues = [...padding, ...gap, ...margin].join(' ');
  const nums = allValues.match(/\d+(?:\.\d+)?(?:px|rem|em)/g) ?? [];
  const scale = unique(nums).sort((a, b) => {
    const toNum = (v: string) => parseFloat(v) * (v.includes('rem') ? 16 : 1);
    return toNum(a) - toNum(b);
  });
  return scale;
}

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

export function extractAllTokens(html: string): Tokens {
  return {
    colors: extractColors(html),
    typography: extractTypography(html),
    spacing: extractSpacing(html),
    radius: extractRadius(html),
    shadows: extractShadows(html),
    animations: extractAnimations(html),
    layout: extractLayout(html),
  };
}
