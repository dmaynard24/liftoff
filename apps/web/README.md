# apps/web

Liftoff frontend — Vite + React + TypeScript + Tailwind CSS v4.

Deployed to Netlify at `liftoff.davemaynard.dev`.

## Stack

- [Vite](https://vite.dev) — build tool and dev server
- [React 19](https://react.dev) — UI
- [TypeScript](https://www.typescriptlang.org) — strict mode
- [Tailwind CSS v4](https://tailwindcss.com) — via `@tailwindcss/vite` plugin (no config file needed)

## Structure

```
src/
  App.tsx       — Main component. Manages three states: input → extracting → done/error
  index.css     — Tailwind entry point (@import "tailwindcss")
  main.tsx      — React root
```

## Key behavior

`App.tsx` opens an `EventSource` to the API's `/api/extract?url=...` endpoint and renders each SSE progress event as a step in a live list. On the `complete` event it receives a `jobId` and shows a link to `/api/jobs/:id/styleguide`.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Base URL of the API server | `""` (same origin) |

In local development, `VITE_API_URL` can be left unset — the Vite dev server proxies all `/api/*` requests to `http://localhost:3000` automatically via the proxy config in `vite.config.ts`.

In Netlify, set `VITE_API_URL=https://liftoff-api.fly.dev` in the site's environment variables.

## Dev

```bash
bun run dev        # start Vite dev server at localhost:5173
bun run build      # production build → dist/
bun run preview    # preview the production build locally
```

Or from the repo root:

```bash
bun run dev:web
```

## Deployment

Netlify site settings:
- **Base directory:** `apps/web`
- **Build command:** `bun run build`
- **Publish directory:** `dist`
- **Environment variable:** `VITE_API_URL=https://liftoff-api.fly.dev`
