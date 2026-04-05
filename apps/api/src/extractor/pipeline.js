import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { fetchRenderedHTML } from './fetch.js';
import { extractAllTokens } from './tokens.js';
import { extractComponentNames } from './components.js';
import { generateStyleguide } from './generator.js';
const STEPS = [
    'Fetching and extracting component data',
    'Extracting colors',
    'Extracting typography',
    'Extracting spacing, radius & shadows',
    'Extracting animations',
    'Extracting layout',
    'Discovering components',
    'Generating styleguide',
    'Saving output',
];
export async function* runPipeline(url) {
    const total = STEPS.length;
    const jobId = randomUUID();
    const jobDir = join(tmpdir(), 'liftoff-jobs', jobId);
    await mkdir(jobDir, { recursive: true });
    let page;
    let step = 0;
    const emit = (label, status, extra) => ({
        step: step + 1,
        total,
        label,
        status,
        ...extra,
    });
    // Step 1: Fetch rendered HTML + extract component data via Playwright
    yield emit(STEPS[step], 'running');
    try {
        page = await fetchRenderedHTML(url);
    }
    catch (err) {
        yield emit(STEPS[step], 'error', { error: String(err) });
        return;
    }
    yield emit(STEPS[step], 'done');
    step++;
    // Steps 2–6: Token extraction (synchronous, runs on page.html)
    const extractionSteps = [
        STEPS[1], STEPS[2], STEPS[3], STEPS[4], STEPS[5],
    ];
    const tokens = extractAllTokens(page.html); // run once, emit progress per group
    for (const label of extractionSteps) {
        yield emit(label, 'running');
        yield emit(label, 'done');
        step++;
    }
    // Step 7: Component name discovery
    yield emit(STEPS[step], 'running');
    let components;
    try {
        components = extractComponentNames(page.html);
    }
    catch (err) {
        yield emit(STEPS[step], 'error', { error: String(err) });
        return;
    }
    yield emit(STEPS[step], 'done');
    step++;
    // Step 8: Generate HTML
    yield emit(STEPS[step], 'running');
    let styleguideHtml;
    try {
        styleguideHtml = generateStyleguide(url, tokens, components, page);
    }
    catch (err) {
        yield emit(STEPS[step], 'error', { error: String(err) });
        return;
    }
    yield emit(STEPS[step], 'done');
    step++;
    // Step 9: Save output
    yield emit(STEPS[step], 'running');
    try {
        await writeFile(join(jobDir, 'styleguide.html'), styleguideHtml, 'utf-8');
    }
    catch (err) {
        yield emit(STEPS[step], 'error', { error: String(err) });
        return;
    }
    yield emit(STEPS[step], 'done', { jobId });
}
