# Liftoff — Website-to-Styleguide App

## Status: Built — pending deployment

---

## Context

Automate the AGENTS.md playbook into a hosted web app: user pastes a URL, the backend fetches the fully-rendered HTML via Playwright, runs procedural regex extraction across colors/typography/spacing/radius/shadows/animations/layout, and returns a single self-contained `styleguide.html`. No AI, no screenshots.

---

## Tech Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS v4 → Netlify (`liftoff.davemaynard.dev`)
- **Backend:** Bun + Hono + TypeScript + Playwright → Fly.io (`liftoff-api.fly.dev`)
- **Transport:** SSE (Server-Sent Events) for real-time step progress
- **Config:** `VITE_API_URL` env var points the frontend at the Fly.io API

---

## Repo Structure (as built)

```
liftoff/
  apps/
    web/                        # Netlify frontend
      src/
        App.tsx                 # 3-state UI: input → progress → result
        index.css               # @import "tailwindcss"
        main.tsx
      vite.config.ts            # Tailwind v4 via @tailwindcss/vite
      netlify.toml              # build: "bun run build", publish: dist
    api/                        # Fly.io backend
      src/
        index.ts                # Hono server, SSE route, CORS, job file serving
        extractor/
          fetch.ts              # Playwright: fetchRenderedHTML(url) → string
          tokens.ts             # extractAllTokens(html) + individual extractors
          components.ts         # extractComponentNames(html) → ComponentInfo[]
          generator.ts          # generateStyleguide(url, tokens, components) → HTML string
          pipeline.ts           # runPipeline(url) async generator → ProgressEvent
      Dockerfile                # Bun + Playwright Chromium, apt deps
      fly.toml                  # shared-cpu-1x, 1GB RAM, region: iad
  package.json                  # Bun workspace + concurrently dev scripts
  capture-screenshots.mjs       # Leftover from pre-app era — safe to delete
```

---

## Implementation Notes

### Pipeline (actual behavior)
`pipeline.ts` runs 9 labeled steps via an async generator. Steps 2–6 (colors through layout) all call `extractAllTokens(html)` once and assign results together — they're split into separate SSE events for UI feedback, not separate computation. The true I/O steps are step 1 (Playwright fetch) and step 9 (file write).

### SSE event shape
```ts
// event: "progress"
{ step: number, total: 9, label: string, status: "running" | "done" }

// event: "error"
{ step: number, total: 9, label: string, status: "error", error: string }

// event: "complete"
{ jobId: string }   // UUID — use to fetch /api/jobs/:id/styleguide
```

### Job storage
Output written to `$TMPDIR/liftoff-jobs/<uuid>/styleguide.html`. Ephemeral — no cleanup job yet, Fly.io VM restarts will clear it naturally.

### CORS
`apps/api/src/index.ts` allows `http://localhost:5173` and `https://liftoff.davemaynard.dev`.

---

## Deployment Checklist

### Local verification
- [ ] `cd apps/api && bunx playwright install chromium` (one-time)
- [ ] Create `apps/web/.env.local` with `VITE_API_URL=http://localhost:3000`
- [ ] `bun run dev` from root — API at `:3000`, web at `:5173`
- [ ] Submit a URL, confirm SSE stream logs all 9 steps, result link opens styleguide

### Fly.io (API)
- [ ] `cd apps/api && fly launch` — app name: `liftoff-api`, region: `iad`
- [ ] `fly deploy` for subsequent pushes
- [ ] Confirm `https://liftoff-api.fly.dev/api/extract?url=https://example.com` streams SSE

### Netlify (Frontend)
- [ ] Create new Netlify site from this repo
- [ ] Base directory: `apps/web`, build command: `bun run build`, publish: `dist`
- [ ] Add env var: `VITE_API_URL=https://liftoff-api.fly.dev`
- [ ] Add CNAME `liftoff` → Netlify site hostname in davemaynard.dev DNS settings

### Cleanup
- [ ] Delete `capture-screenshots.mjs` from repo root (screenshots dropped from pipeline)

---

## Future work (not built)
- Job TTL / cleanup of `$TMPDIR/liftoff-jobs/` after N hours
- Download button for the styleguide HTML
- Rate limiting on `/api/extract`
- AI-assisted token categorization (v2)
