# Liftoff

A manual / AI-assisted playbook for converting any website into a comprehensive design system styleguide.

## Structure

- `ideas/` — Output folder. Each site gets its own `ideas/idea{#}/` directory containing `tokens.md`, `styleguide.html`, and reference screenshots.
- `scripts/capture-screenshots.mjs` — Captures full-page screenshots at 1440px viewport. Auto-discovers subpages.
- `AGENTS.md` — The complete step-by-step playbook.
- `CLAUDE.md` — Mirrors `AGENTS.md` for use as Claude Code project instructions.

## Quick Start

Using Claude Code (Opus 4.6 or greater), ask it to create a new idea:

```
Create a new idea using https://example.com
```

Claude will follow the playbook in `AGENTS.md` end-to-end: capturing screenshots, extracting tokens, and producing a self-contained `styleguide.html`.

## Scripts

```bash
# Capture full-page screenshots for a site
node scripts/capture-screenshots.mjs <URL> ideas/idea{#}
```
