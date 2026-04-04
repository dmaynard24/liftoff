export interface ComponentInfo {
  name: string;
  source: 'data-component' | 'data-element' | 'data-block' | 'semantic-class';
}

export function extractComponentNames(html: string): ComponentInfo[] {
  const seen = new Set<string>();
  const components: ComponentInfo[] = [];

  const add = (name: string, source: ComponentInfo['source']) => {
    const key = name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      components.push({ name, source });
    }
  };

  // data-component-name="..."
  for (const m of html.matchAll(/data-component-name="([^"]+)"/g)) {
    add(m[1], 'data-component');
  }
  // data-component="..."
  for (const m of html.matchAll(/data-component="([^"]+)"/g)) {
    add(m[1], 'data-component');
  }
  // data-element-name="..."
  for (const m of html.matchAll(/data-element-name="([^"]+)"/g)) {
    add(m[1], 'data-element');
  }
  // data-block="..."
  for (const m of html.matchAll(/data-block="([^"]+)"/g)) {
    add(m[1], 'data-block');
  }
  // Semantic class patterns: "card", "hero", "nav", "footer", "header", "modal", "badge", "chip"
  const semanticPattern =
    /class="[^"]*\b(card|hero|navbar|header|footer|modal|badge|chip|button|btn|tag|avatar|tooltip|sidebar|banner)\b[^"]*"/gi;
  for (const m of html.matchAll(semanticPattern)) {
    add(m[1].toLowerCase(), 'semantic-class');
  }

  return components;
}
