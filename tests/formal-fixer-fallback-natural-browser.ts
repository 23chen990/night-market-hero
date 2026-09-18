import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const out = 'qa-evidence/formal-fixer-fallback-round-20260904';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--single-process'] });
const page = await browser.newPage({ viewport: { width: 1180, height: 720 } });
const errors: string[] = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(error.message));
await page.goto('http://127.0.0.1:4178/?seed=31', { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__PROTOTYPE_TEST__ && window.__FORMAL_TEST__));
await page.screenshot({ path: `${out}/startup-desktop.png` });
const box = await page.locator('[data-action="grapple"]').boundingBox();
if (!box) throw new Error('grapple surface missing');
const high: Array<{ x: number; y: number }> = [];
const roof: Array<{ phase: string; playerX: number; boundsX: number }> = [];
let collision: unknown = null;
let guardMutual: unknown = null;
for (let cycle = 0; cycle < 18; cycle += 1) {
  const start = await page.evaluate(() => window.__PROTOTYPE_TEST__.getState());
  if (start.status !== 'playing') break;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  let released = false;
  for (let tick = 0; tick < 180; tick += 1) {
    await page.waitForTimeout(16);
    const state = await page.evaluate(() => window.__PROTOTYPE_TEST__.getState());
    if (state.routeTraversal?.phase === 'branch' && state.routeTraversal.committedRoute === 'high') high.push({ x: state.player.x, y: state.player.y });
    if (state.chaseObstacle) roof.push({ phase: state.chaseObstacle.phase, playerX: state.player.x, boundsX: state.chaseObstacle.bounds.x });
    if (state.status !== 'playing') { await page.mouse.up(); released = true; break; }
    if (state.attachedAnchorId && state.ropeLength) {
      const anchor = state.anchors.find((item) => item.id === state.attachedAnchorId);
      if (anchor && state.player.x > anchor.x + state.ropeLength * 0.45 && state.player.vx > 100) {
        await page.mouse.up(); released = true; break;
      }
    }
  }
  if (!released) await page.mouse.up();
  await page.waitForTimeout(30);
  const events = await page.evaluate(() => window.__FORMAL_TEST__.getEvents());
  collision ??= events.find((event) => event.type === 'closing-gate-collision') ?? null;
  const visibility = await page.evaluate(() => {
    const edge = document.querySelector<HTMLElement>('[data-ui="pursuer"]');
    const style = edge ? getComputedStyle(edge) : null;
    return {
      world: document.querySelector('#app')?.getAttribute('data-guard-on-screen') === 'true',
      edge: edge && style ? { data: edge.dataset.visible, hidden: edge.hidden, display: style.display, rect: edge.getBoundingClientRect().toJSON() } : null,
    };
  });
  if (visibility.world && visibility.edge) guardMutual ??= visibility.edge;
  const after = await page.evaluate(() => window.__PROTOTYPE_TEST__.getState());
  if (after.status !== 'playing') break;
}
const terminal = await page.evaluate(() => window.__PROTOTYPE_TEST__.getState());
await page.screenshot({ path: `${out}/terminal-desktop.png` });
let replay: unknown = null;
if (terminal.status === 'won') {
  const continueButton = page.locator('[data-action="continue"]');
  if (await continueButton.isVisible()) await continueButton.click();
  await page.waitForTimeout(80);
  const state = await page.evaluate(() => window.__PROTOTYPE_TEST__.getState());
  const hidden = await page.locator('[data-ui="result"]').evaluate((element) => (element as HTMLElement).hidden);
  replay = { levelId: state.levelId, status: state.status, resultHidden: hidden };
  await page.screenshot({ path: `${out}/replay-desktop.png` });
}
await page.setViewportSize({ width: 844, height: 390 });
await page.goto('http://127.0.0.1:4178/?seed=31', { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.__PROTOTYPE_TEST__));
await page.screenshot({ path: `${out}/startup-landscape-844x390.png` });
const mobile = await page.evaluate(() => {
  const edge = document.querySelector<HTMLElement>('[data-ui="pursuer"]');
  const style = edge ? getComputedStyle(edge) : null;
  return { viewport: '844x390', edgeData: edge?.dataset.visible, hidden: edge?.hidden, display: style?.display };
});
console.log(JSON.stringify({ terminal, replay, guardMutual, highRoute: { samples: high.length, range: high.length ? [Math.min(...high.map((item) => item.y)), Math.max(...high.map((item) => item.y))] : null, status: high.length ? 'OBSERVED' : 'BLOCKED' }, roofNet: { samples: roof.length, phases: [...new Set(roof.map((item) => item.phase))], reachedBounds: roof.some((item) => item.playerX >= item.boundsX) }, gateCollision: collision ? { status: 'PASS', event: collision } : { status: 'BLOCKED' }, mobile, errors }, null, 2));
await browser.close();
