import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:4178/';
const workspace = resolve(import.meta.dirname, '..');
const evidenceDir = resolve(workspace, 'qa-evidence/natural-journey-20260921');

type ViewportCase = { id: string; width: number; height: number };
type State = {
  levelId: string;
  status: string;
  failureReason: string | null;
  tick: number;
  progress: number;
  player: { x: number; y: number };
  inputTransitions: number;
};

const viewports: ViewportCase[] = [
  { id: 'desktop-1280x720', width: 1280, height: 720 },
  { id: 'landscape-844x390', width: 844, height: 390 },
];

async function getState(page: Page): Promise<State> {
  return page.evaluate(() => (window as any).__PROTOTYPE_TEST__.getState() as State);
}

async function runTutorialInput(page: Page): Promise<State> {
  const surface = page.locator('[data-action="grapple"]');
  const box = await surface.boundingBox();
  assert.ok(box, 'grapple surface must be present');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  // This is an ordinary touch/mouse rhythm. The game fixes the simulation
  // cadence; the browser supplies the variable frame timing being tested.
  for (let cycle = 0; cycle < 48; cycle += 1) {
    const before = await getState(page);
    if (before.status !== 'playing') break;
    await page.mouse.down();
    await page.waitForTimeout(240);
    await page.mouse.up();
    await page.waitForTimeout(60);
  }
  return getState(page);
}

async function waitForTerminal(page: Page): Promise<State> {
  await page.waitForFunction(() => (window as any).__PROTOTYPE_TEST__.getState().status !== 'playing', undefined, { timeout: 8_000 });
  return getState(page);
}

async function hashFile(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function runLandscapeCase(viewport: ViewportCase): Promise<Record<string, unknown>> {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const errors: string[] = [];
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('GPU stall')) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const shot = (name: string): string => resolve(evidenceDir, `${viewport.id}-${name}.png`);

  await page.goto(`${baseUrl}?seed=31&fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean((window as any).__PROTOTYPE_TEST__ && (window as any).__FORMAL_TEST__));
  const startup = await getState(page);
  assert.equal(startup.status, 'playing');
  assert.equal(startup.levelId, 'lantern-entry');
  await page.screenshot({ path: shot('startup'), fullPage: true });

  const tutorial = await runTutorialInput(page);
  assert.equal(tutorial.status, 'won', `${viewport.id} tutorial must reach settlement`);
  assert.equal(tutorial.progress, 1);
  await page.screenshot({ path: shot('tutorial-terminal'), fullPage: true });

  await page.locator('[data-action="continue"]').click();
  await page.waitForFunction(() => {
    const state = (window as any).__PROTOTYPE_TEST__.getState();
    return state.levelId === 'night-patrol' && state.status === 'playing';
  });
  const patrol = await getState(page);
  await page.screenshot({ path: shot('night-patrol'), fullPage: true });

  // No-input patrol is a natural failure path: it confirms the visible
  // terminal/restart contract without state injection or debug helpers.
  const failed = await waitForTerminal(page);
  assert.equal(failed.status, 'failed');
  await page.screenshot({ path: shot('night-patrol-failed'), fullPage: true });
  await page.locator('[data-action="restart"]').click();
  await page.waitForFunction(() => {
    const state = (window as any).__PROTOTYPE_TEST__.getState();
    return state.levelId === 'night-patrol' && state.status === 'playing';
  });
  const replay = await getState(page);
  const resultHidden = await page.locator('[data-ui="result"]').evaluate((node) => (node as HTMLElement).hidden);
  assert.equal(resultHidden, true);
  await page.screenshot({ path: shot('night-patrol-replay'), fullPage: true });

  await browser.close();
  assert.deepEqual(errors, [], `${viewport.id} must have no console/page errors`);
  const screenshots = await Promise.all([
    'startup', 'tutorial-terminal', 'night-patrol', 'night-patrol-failed', 'night-patrol-replay',
  ].map(async (name) => ({ path: shot(name), sha256: await hashFile(shot(name)) })));
  return {
    viewport: `${viewport.width}x${viewport.height}`,
    startup: { status: startup.status, levelId: startup.levelId },
    tutorial: { status: tutorial.status, progress: tutorial.progress, tick: tutorial.tick, inputTransitions: tutorial.inputTransitions },
    nightPatrol: { levelId: patrol.levelId, status: patrol.status },
    terminal: { status: failed.status, failureReason: failed.failureReason },
    replay: { levelId: replay.levelId, status: replay.status, resultHidden },
    screenshots,
    errors,
  };
}

async function runPortraitCase(): Promise<Record<string, unknown>> {
  const browser = await chromium.launch({ headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('GPU stall')) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  const path = resolve(evidenceDir, 'portrait-390x844.png');
  await page.goto(`${baseUrl}?seed=31&fresh=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean((window as any).__PROTOTYPE_TEST__));
  const before = await getState(page);
  await page.waitForTimeout(250);
  const after = await getState(page);
  const orientationVisible = await page.locator('[data-ui="orientation-block"]').isVisible();
  assert.equal(orientationVisible, true);
  assert.equal(before.tick, after.tick);
  assert.equal(after.status, 'playing');
  await page.screenshot({ path, fullPage: true });
  await browser.close();
  assert.deepEqual(errors, []);
  return { viewport: '390x844', orientationVisible, frozen: before.tick === after.tick, screenshot: { path, sha256: await hashFile(path) }, errors };
}

await mkdir(evidenceDir, { recursive: true });
const landscapeResults = [];
for (const viewport of viewports) landscapeResults.push(await runLandscapeCase(viewport));
const portrait = await runPortraitCase();
const report = {
  schemaVersion: 1,
  artifactType: 'natural-runtime-qa-report',
  targetGame: '夜市飞侠：护印突围',
  targetWorkspace: workspace,
  route: 'formal-fixer',
  passed: true,
  checks: landscapeResults,
  portrait,
  runtimeWiredEntrypointFiles: [resolve(workspace, 'src/main.ts'), resolve(workspace, 'src/game-core.ts'), resolve(workspace, 'src/run-snapshot.ts')],
  evidenceGaps: [
    'Rooftops Batch B art remains BLOCKED pending an approved composition; this report covers the gameplay journey only.',
    'Web-lite evidence does not establish WeChat, Douyin, or TapTap package publishability.',
  ],
};
await writeFile(resolve(evidenceDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
