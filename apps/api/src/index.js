import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { runPipeline } from './extractor/pipeline.js';
const app = new Hono();
const ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'https://liftoff.davemaynard.dev',
];
app.use('/api/*', cors({
    origin: (origin) => (ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]),
    allowMethods: ['GET'],
}));
// SSE extraction endpoint
app.get('/api/extract', async (c) => {
    const url = c.req.query('url');
    if (!url) {
        return c.json({ error: 'Missing url query param' }, 400);
    }
    try {
        new URL(url);
    }
    catch {
        return c.json({ error: 'Invalid URL' }, 400);
    }
    return streamSSE(c, async (stream) => {
        for await (const event of runPipeline(url)) {
            await stream.writeSSE({
                data: JSON.stringify(event),
                event: event.status === 'error' ? 'error' : 'progress',
            });
            if (event.status === 'done' && event.jobId) {
                await stream.writeSSE({
                    data: JSON.stringify({ jobId: event.jobId }),
                    event: 'complete',
                });
            }
        }
    });
});
// Serve generated styleguide
app.get('/api/jobs/:id/styleguide', async (c) => {
    const id = c.req.param('id');
    // Basic UUID validation to prevent path traversal
    if (!/^[0-9a-f-]{36}$/.test(id)) {
        return c.json({ error: 'Invalid job ID' }, 400);
    }
    const filePath = join(tmpdir(), 'liftoff-jobs', id, 'styleguide.html');
    try {
        const html = await readFile(filePath, 'utf-8');
        return c.html(html);
    }
    catch {
        return c.json({ error: 'Job not found' }, 404);
    }
});
const port = parseInt(process.env.PORT ?? '3000', 10);
export default {
    fetch: app.fetch,
    port,
};
