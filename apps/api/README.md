# apps/api

Liftoff backend — Bun + Hono + Playwright.

Deployed to Fly.io (`liftoff-api.fly.dev`), region `iad` (Ashburn, VA).

## Stack

- [Bun](https://bun.sh) — runtime and package manager
- [Hono](https://hono.dev) — lightweight HTTP framework
- [Playwright](https://playwright.dev) — headless Chromium for fetching fully-rendered HTML (supports SPAs)
- TypeScript — strict mode via `bun-types`

## Structure

```
src/
  index.ts                   — Hono server, routes, CORS
  extractor/
    fetch.ts                 — Playwright: navigates to URL, returns page.content()
    tokens.ts                — Regex extractors for colors, typography, spacing, radius, shadows, animations, layout
    components.ts            — Component name discovery from data attributes and semantic classes
    generator.ts             — Builds the self-contained styleguide.html from extracted tokens
    pipeline.ts              — Orchestrates all steps, yields SSE progress events
```

## API routes

| Route | Description |
|-------|-------------|
| `GET /api/extract?url=<url>` | SSE stream — runs the full extraction pipeline and emits progress events |
| `GET /api/jobs/:id/styleguide` | Serves the generated `styleguide.html` for a completed job |

### SSE event shape

```ts
// event: "progress"
{ step: number, total: number, label: string, status: "running" | "done" }

// event: "error"
{ step: number, total: number, label: string, status: "error", error: string }

// event: "complete"
{ jobId: string }
```

Job output is written to `$TMPDIR/liftoff-jobs/<uuid>/styleguide.html`.

## Extraction pipeline steps

1. Fetch rendered HTML (Playwright — handles SPAs)
2. Extract colors
3. Extract typography
4. Extract spacing, radius & shadows
5. Extract animations
6. Extract layout
7. Discover components
8. Generate styleguide HTML
9. Save output to job directory

## Dev

Install Playwright's Chromium browser once after `bun install`:

```bash
bunx playwright install chromium
```

Then start the server:

```bash
bun run dev     # watch mode, restarts on file changes → localhost:3000
bun run start   # production mode
```

Or from the repo root:

```bash
bun run dev:api
```

## Deployment

Deployed via Docker to Fly.io. The `Dockerfile` installs Bun, Playwright system deps, and Chromium.

```bash
# First deploy (from apps/api/)
fly launch

# Subsequent deploys
fly deploy
```

Config: `fly.toml` — 1GB RAM shared VM, region `iad`, auto-stop when idle.
