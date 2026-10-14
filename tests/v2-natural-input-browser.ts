/** Optional observational browser run. No simulation/teleport/scenario mutation.
 * Locally use V2_BROWSER_EMBED=1 to load the self-contained HTML via
 * document.write when file:// navigation is blocked by runner policy.
 * This is an evidence generator, not an independent human approval.
 */
import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GrappleState } from '../src/game-core.ts';

const target = resolve('dist/index.html');
const targetHtml = await readFile(target, 'utf8');
const buildSha256 = createHash('sha256').update(targetHtml).digest('hex');
const root = resolve(process.env.V2_EVIDENCE_DIR ?? 'evidence/v2-input');
await mkdir(root, { recursive: true });
const embedded = process.env.V2_BROWSER_EMBED === '1';
const executablePath = process.env.V2_CHROMIUM_PATH || undefined;
const maxSeconds = Number(process.env.V2_DURATION_SECONDS ?? 45);
const skilledRoute = process.env.V2_SKILLED_ROUTE === '1';
const viewportFilter = process.env.V2_VIEWPORT ?? 'both';
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath, args: ['--no-sandbox'] } : {}) });
const results: unknown[] = [];
try {
  for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 720 }].filter(v =>
    viewportFilter === 'both' || (viewportFilter === 'mobile' && v.width === 844)
      || (viewportFilter === 'desktop' && v.width === 1280))) {
    const touch = viewport.width < 900;
    const id = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport, hasTouch: touch, deviceScaleFactor: 1,
      recordVideo: { dir: root, size: viewport } });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const cdp = touch ? await context.newCDPSession(page) : null;
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(String(e)));
    const traces: unknown[] = [];
    // Exact button edges are recorded before asynchronous screenshots, allowing
    // the independent compare gate to prove skill is player input, not a grant.
    const inputEdges: Array<{ tick: number; action: 'press' | 'release' }> = [];
    const screenshots: string[] = [];
    const encounters = new Map<string, { type: string; result: string; reason: string; tick: number }>();
    const seenOffers = new Set<string>();
    const seenRides = new Set<string>();
    const seenSegments = new Set<number>();
    const nearest: Record<string, { distancePx: number; heightDifferencePx: number;
      inputHeld: boolean; attached: boolean; playerX: number; playerY: number;
      targetY: number; requiredAction: string; tick: number }> = {};
    let held = false, holdAt = -10000, releaseAt = -10000, revives = 0;
    const touchPoint = { x: Math.round(viewport.width * .13), y: Math.round(viewport.height * .72), id: 1 };
    const getState = (): Promise<GrappleState> => page.evaluate(() => (window as unknown as {
      __PROTOTYPE_TEST__: { getState(): GrappleState }
    }).__PROTOTYPE_TEST__.getState());
    const edge = async (down: boolean, tick: number): Promise<void> => {
      if (down === held) return;
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: down ? 'touchStart' : 'touchEnd',
        touchPoints: down ? [touchPoint] : [] });
      else if (down) await page.keyboard.down('Space'); else await page.keyboard.up('Space');
      held = down;
      inputEdges.push({ tick, action: down ? 'press' : 'release' });
      if (down) holdAt = tick; else releaseAt = tick;
    };
    // Capture asynchronously: blocking on a PNG encode can consume the
    // entire 200-ms real-input release window while the world keeps moving.
    // Screenshot work is serialized for reliable ordering, but never stalls
    // a press/release decision. Drain it before closing the browser page.
    let screenshotChain: Promise<void> = Promise.resolve();
    const shot = (name: string): void => {
      screenshotChain = screenshotChain.then(async () => {
        await page.screenshot({ path: `${root}/${id}-${name}.png` });
        screenshots.push(name);
      }).catch(error => { errors.push(`screenshot ${name}: ${String(error)}`); });
    };
    try {
      if (embedded) {
        // about:blank has an opaque origin; ordinary localStorage access throws.
        // The document.write workaround is local observation ONLY. Inject an
        // in-memory Storage implementation, never production/test CI grants.
        await page.evaluate(() => {
          const values = new Map<string, string>();
          Object.defineProperty(window, 'localStorage', { configurable: true, value: {
            getItem(key: string) { return values.get(key) ?? null; },
            setItem(key: string, value: string) { values.set(key, String(value)); },
            removeItem(key: string) { values.delete(key); },
            clear() { values.clear(); },
            get length() { return values.size; },
            key(index: number) { return [...values.keys()][index] ?? null; },
          } });
        });
        await page.setContent(targetHtml, { waitUntil: 'domcontentloaded', timeout: 30000 });
      } else await page.goto(pathToFileURL(target).href, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => Boolean((window as unknown as { __PROTOTYPE_TEST__?: unknown }).__PROTOTYPE_TEST__));
      shot('start-card');
      await screenshotChain; // launch card is paused: exact startup frame is safe to await
      await page.locator('[data-action="start-run"]').click();
      if (!touch) await page.locator('[data-action="grapple"]').focus();
      const began = Date.now();
      for (let step = 0; Date.now() - began < maxSeconds * 1000; step++) {
        const s = await getState();
        if (step % 5 === 0) traces.push({ ms: Date.now() - began, tick: s.tick, status: s.status,
          level: s.levelId, segment: s.segmentIndex, x: s.player.x, y: s.player.y,
          vx: s.player.vx, vy: s.player.vy, vehicle: s.vehicleId,
          attachedAnchorId: s.attachedAnchorId, distance: s.chase.distance, inputTransitions: s.inputTransitions });
        if (s.status !== 'playing') {
          await edge(false, s.tick);
          shot(`terminal-${revives}`);
          if (s.levelId !== 'night-patrol' && s.status === 'won') {
            await page.locator('[data-action="continue"]').click();
            releaseAt = -10000;
            if (!touch) await page.locator('[data-action="grapple"]').focus();
            continue;
          }
          if (s.status === 'failed' && revives === 0 && await page.locator('[data-action="revive"]').isVisible()) {
            revives++;
            await page.locator('[data-action="revive"]').click();
            releaseAt = -10000;
            if (!touch) await page.locator('[data-action="grapple"]').focus();
            continue;
          }
          break;
        }
        if (s.levelId === 'night-patrol') {
          for (const offer of s.vehicleOffers) {
            const key = offer.instanceId ?? `${offer.segment}-${offer.id}`;
            // The next observation may already say claimed, so record the
            // nearest ACTUAL approached point across the resolution frame.
            if (Math.abs(s.player.x - offer.x) < 1300) {
              const distancePx = Math.abs(s.player.x - offer.x);
              if (!nearest[key] || distancePx < nearest[key]!.distancePx) {
                nearest[key] = { distancePx, heightDifferencePx: s.player.y - offer.y,
                  inputHeld: s.inputHeld, attached: !!s.attachedAnchorId,
                  playerX: s.player.x, playerY: s.player.y, targetY: offer.y,
                  requiredAction: offer.requiredAction ?? 'release', tick: s.tick };
              }
            }
            if (offer.status === 'available' && s.player.x >= offer.x - 850
              && s.player.x <= offer.x - 350 && !seenOffers.has(key)) {
              seenOffers.add(key);
              shot(`approach-${offer.segment}-${offer.id}`);
            }
          }
          for (const event of s.encounterEvents ?? []) {
            if (encounters.has(event.instanceId)) continue;
            encounters.set(event.instanceId, { type: event.id, result: event.outcome,
              reason: event.reason, tick: event.tick });
            shot(`encounter-${event.segment}-${event.outcome}`);
          }
          if (s.vehicleId && !seenRides.has(s.vehicleId)) { seenRides.add(s.vehicleId); shot(`ride-${s.vehicleId}`); }
          if (!seenSegments.has(s.segmentIndex)) { seenSegments.add(s.segmentIndex); if (s.segmentIndex % 2 === 0) shot(`segment-${s.segmentIndex}`); }
        }
        const anchor = s.anchors.find(item => item.id === s.attachedAnchorId);
        let wantHold = s.vehicleId
          ? s.vehicleId === '货运滑索' ? s.vehicleTicksRemaining > 100
            : s.vehicleId === '灯笼群' ? s.vehiclePhase !== 'holding' ? s.tick - releaseAt > 26 : s.player.vy > 0 && s.player.vx >= 240
              : s.player.y > 390
          : anchor ? !(s.player.x > anchor.x + 12 && s.player.vx > 0 && s.player.vy < 60) && s.player.vx >= 0 && s.tick - holdAt < 160
            : s.tick - releaseAt > 20 && (s.player.vy > 0 || s.player.y > 540 || s.inputTransitions === 0);
        // Intentional conservative choice: keep holding the actual rope
        // while the optional pulley passes; no simulation state manipulation.
        // Not a blind-player success-rate estimate.
        if (!skilledRoute && s.levelId === 'night-patrol' && !s.vehicleId) {
          const pulley = s.vehicleOffers.find(offer => offer.id === '货运滑索' && offer.status === 'available');
          if (pulley && s.player.x >= pulley.x - 310 && s.player.x < pulley.x + 165) wantHold = true;
        }
        if (skilledRoute && s.levelId === 'night-patrol' && !s.vehicleId) {
          const first = s.vehicleOffers.find(offer => offer.id === '货运滑索' && offer.status === 'available');
          if (first && s.player.x >= first.x - 155 && s.player.x <= first.x + 25
            && !!s.attachedAnchorId && s.player.y >= first.y - 120)
            wantHold = false; // a deliberate player release at the visible ring
          const kite = s.vehicleOffers.find(offer => offer.id === '纸鸢' && offer.status === 'available');
          // A real one-finger skill sequence on the fixed roof supports:
          // 1. Hold the next visible high roof rope through its rising arc.
          // 2. Release BEFORE the apex, then remain airborne until crossing
          //    the pictured kite handle. Regrappling a later ordinary beam
          //    would pull the hero away before the handle can be touched.
          // This uses genuine input edges; never moves or enlarges the target.
          if (kite && s.player.x >= kite.x - 530 && s.player.x <= kite.x + 140) {
            const ahead = kite.x - s.player.x;
            if (anchor) {
              if (ahead >= 148 && ahead <= 245 &&
                  s.player.y >= 500 && s.player.y <= 635 && s.player.vy < -110) {
                wantHold = false;
              } else if (ahead > 145) {
                wantHold = true;
              }
            } else if (ahead <= 250 &&
                       s.tick - s.lastGrappleReleaseTick >= 0 &&
                       s.tick - s.lastGrappleReleaseTick < 100) {
              wantHold = false;
            }
          }
        }
        await edge(wantHold, s.tick);
        if (held && !s.inputHeld && s.inputTransitions > 0 && s.tick - holdAt > 30) await edge(false, s.tick);
        await page.waitForTimeout(70);
      }
      await edge(false, (await getState()).tick);
      const state = await getState();
      shot('end');
      await screenshotChain;
      results.push({ viewport, inputMode: touch ? 'touch' : 'keyboard', embedded, skilledRoute, duration: maxSeconds,
        finalStatus: state.status, level: state.levelId, worldX: state.player.x,
        segment: state.segmentIndex, revives, seenRides: [...seenRides],
        encounters: [...encounters.entries()], nearest, inputEdges,
        screenshotNames: screenshots, errors, samples: traces });
    } catch (error) {
      errors.push(`runner:${String(error)}`);
      results.push({ viewport, inputMode: touch ? 'touch' : 'keyboard', errors, screenshotNames: screenshots, samples: traces });
    } finally {
      await screenshotChain;
      await context.close();
      try { await page.video()?.saveAs(`${root}/${id}-journey.webm`); } catch { /* evidence failure surfaced in report */ }
    }
  }
} finally { await browser.close(); }
await writeFile(`${root}/report.json`, JSON.stringify({ source: target, buildSha256,
  observation: embedded ? 'browser touch/key input with document.write and in-memory localStorage shim (NOT file URL or human QA)'
    : 'file URL browser touch/key input; state-observing driver (NOT blind human QA)', results }, null, 2));
console.log(JSON.stringify(results.map(item => { const r = item as Record<string, unknown>; return { viewport: r.viewport,
  status: r.finalStatus, segment: r.segment, worldX: r.worldX, encounters: r.encounters, rides: r.seenRides, errors: r.errors }; }), null, 2));
