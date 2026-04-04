import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { fetchRenderedHTML } from './fetch.js';
import { extractAllTokens } from './tokens.js';
import { extractComponentNames } from './components.js';
import { generateStyleguide } from './generator.js';

export interface ProgressEvent {
  step: number;
  total: number;
  label: string;
  status: 'running' | 'done' | 'error';
  error?: string;
  jobId?: string;
}

const STEPS = [
  'Fetching rendered HTML',
  'Extracting colors',
  'Extracting typography',
  'Extracting spacing, radius & shadows',
  'Extracting animations',
  'Extracting layout',
  'Discovering components',
  'Generating styleguide',
  'Saving output',
] as const;

export async function* runPipeline(url: string): AsyncGenerator<ProgressEvent> {
  const total = STEPS.length;
  const jobId = randomUUID();
  const jobDir = join(tmpdir(), 'liftoff-jobs', jobId);
  await mkdir(jobDir, { recursive: true });

  let html = '';
  let step = 0;

  const emit = (label: string, status: ProgressEvent['status'], extra?: Partial<ProgressEvent>): ProgressEvent => ({
    step: step + 1,
    total,
    label,
    status,
    ...extra,
  });

  // Step 1: Fetch rendered HTML
  yield emit(STEPS[step], 'running');
  try {
    html = await fetchRenderedHTML(url);
  } catch (err) {
    yield emit(STEPS[step], 'error', { error: String(err) });
    return;
  }
  yield emit(STEPS[step], 'done');
  step++;

  // Steps 2–7: Token extraction (fast, synchronous)
  const extractionSteps: Array<{ label: string; key: keyof ReturnType<typeof extractAllTokens> }> = [
    { label: STEPS[1], key: 'colors' },
    { label: STEPS[2], key: 'typography' },
    { label: STEPS[3], key: 'spacing' },
    { label: STEPS[4], key: 'animations' },
    { label: STEPS[5], key: 'layout' },
  ];

  const tokens = { colors: null, typography: null, spacing: null, radius: null, shadows: null, animations: null, layout: null } as any;

  for (const { label, key } of extractionSteps) {
    yield emit(label, 'running');
    try {
      const all = extractAllTokens(html);
      Object.assign(tokens, all);
    } catch (err) {
      yield emit(label, 'error', { error: String(err) });
      return;
    }
    yield emit(label, 'done');
    step++;
  }

  // Step 7: Component discovery
  yield emit(STEPS[step], 'running');
  let components;
  try {
    components = extractComponentNames(html);
  } catch (err) {
    yield emit(STEPS[step], 'error', { error: String(err) });
    return;
  }
  yield emit(STEPS[step], 'done');
  step++;

  // Step 8: Generate HTML
  yield emit(STEPS[step], 'running');
  let styleguideHtml: string;
  try {
    styleguideHtml = generateStyleguide(url, tokens, components);
  } catch (err) {
    yield emit(STEPS[step], 'error', { error: String(err) });
    return;
  }
  yield emit(STEPS[step], 'done');
  step++;

  // Step 9: Save output
  yield emit(STEPS[step], 'running');
  try {
    await writeFile(join(jobDir, 'styleguide.html'), styleguideHtml, 'utf-8');
  } catch (err) {
    yield emit(STEPS[step], 'error', { error: String(err) });
    return;
  }
  yield emit(STEPS[step], 'done', { jobId });
}
