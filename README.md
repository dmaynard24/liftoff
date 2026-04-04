# Liftoff

This is a tool for converting any website into a comprehensive styleguide.

## Structure

- `ideas/` - Prototyping folder containing HTML, CSS, and JavaScript prototypes for brainstorming and moodboarding
- `capture-screenshots.mjs` - Script for capturing full-page screenshots from websites
- `AGENTS.md` - Detailed playbook for converting websites into design system styleguides
- `research.md` - Research notes and findings
- `CLAUDE.md` - AI assistant configuration and notes

## Website-to-Styleguide Process

The repository includes a systematic approach for extracting design tokens, components, and patterns from websites. See [AGENTS.md](AGENTS.md) for the complete step-by-step playbook.

### Quick Start

Using any AI coding assistant (recommend Claude Code with Opus 4.6 or greater), ask it to create a new idea:
```
Create a new idea using https://lunatemplate.framer.website/
```

## App — Local Development

The app lives in `apps/web` (Vite + React frontend) and `apps/api` (Bun + Hono backend with Playwright).

### Prerequisites

- [Bun](https://bun.sh) — `curl -fsSL https://bun.sh/install | bash`
- Playwright's Chromium browser — run once after installing deps:
  ```bash
  cd apps/api && bunx playwright install chromium
  ```

### Install dependencies

```bash
bun run install:all
```

### Run both servers together

```bash
bun run dev
```

This starts:
- API at `http://localhost:3000` (Bun + Hono)
- Web at `http://localhost:5173` (Vite)

The frontend proxies nothing — it calls the API directly. During local dev `VITE_API_URL` is unset, so it defaults to the same origin. Since they run on different ports locally, set it in `apps/web/.env.local`:

```bash
# apps/web/.env.local
VITE_API_URL=http://localhost:3000
```

### Run individually

```bash
bun run dev:api   # API only
bun run dev:web   # Frontend only
```

### Test the extraction

With both servers running, open `http://localhost:5173`, paste any URL, and click Extract. Or hit the API directly:

```bash
curl "http://localhost:3000/api/extract?url=https://stripe.com"
```

You'll see the SSE stream in the terminal. The final `complete` event contains a `jobId` — open `http://localhost:3000/api/jobs/<jobId>/styleguide` to view the result.

## License

This is a personal project for learning and experimentation.