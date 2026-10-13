import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { GrappleState } from '../src/game-core.ts';

// State-observing automated play, not blind human usability evidence.
// No act/step/reset/teleport/scenario APIs. Time is real browser frame time.
// Screenshot work is nonblocking so the driver continues generating input.
const out = resolve('evidence/playable-audit');
await mkdir(out, { recursive: true });
const entry = resolve('dist/index.html');
const sha256 = createHash('sha256').update(await readFile(entry)).digest('hex');
const rides = ['货运滑索', '纸鸢', '灯笼群', '青鸾'];
const browser = await chromium.launch({ headless: true });
const reports: unknown[] = [];
const failures: string[] = [];
try {
  for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 720 }]) {
    const touch = viewport.width < 900;
    const context = await browser.newContext({ viewport, hasTouch: touch, deviceScaleFactor: 1, recordVideo: { dir: out, size: viewport } });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const cdp = touch ? await context.newCDPSession(page) : null;
    // A press already in flight must not hit a newly appearing settlement CTA.
    // Use the left gameplay area; navigate every modal via its visible button.
    const touchPoint = { x: Math.round(viewport.width * .12), y: Math.round(viewport.height * .72), id: 1 };
    const errors: string[] = [];
    const input: unknown[] = [];
    const samples: unknown[] = [];
    const screenshots: unknown[] = [];
    const lifecycle: Record<string, unknown> = {};
    const seen = new Map<string, { firstTick: number; lastTick: number; elapsed: number }>();
    const naturalClaims = new Set<string>();
    const naturalMisses = new Set<string>();
    const pursuitPhases = new Set<string>();
    const seams = new Set<number>();
    let screenshotJob: Promise<unknown> | null = null;
    let captureBusy = false;
    const capturedRides = new Set<string>();
    const capturedMisses = new Set<string>();
    let held = false;
    let lastRelease = -999;
    let holdAt = -999;
    let reviveCount = 0;
    let tutorialCompleted = false;
    const label = `${viewport.width}x${viewport.height}`;
    const started = Date.now();
    const readState = (): Promise<GrappleState> => page.evaluate(() => (window as unknown as { __PROTOTYPE_TEST__: { getState(): GrappleState } }).__PROTOTYPE_TEST__.getState());
    const readMeta = (): Promise<Record<string, unknown>> => page.evaluate(() => (window as unknown as { __GAME_TEST__: { getMetaProgress(): Record<string, unknown> } }).__GAME_TEST__.getMetaProgress());
    const edge = async (down: boolean, tick: number): Promise<void> => {
      if (down === held) return;
      if (cdp) await cdp.send('Input.dispatchTouchEvent', { type: down ? 'touchStart' : 'touchEnd', touchPoints: down ? [touchPoint] : [] });
      else if (down) await page.keyboard.down('Space'); else await page.keyboard.up('Space');
      held = down;
      if (down) holdAt = tick; else lastRelease = tick;
      input.push({ tick, ms: Date.now() - started, edge: down ? 'press' : 'release', device: touch ? 'touch' : 'keyboard', point: touch ? touchPoint : null });
    };
    const shot = (name: string, state: GrappleState): boolean => {
      if (captureBusy) return false;
      captureBusy = true;
      screenshots.push({ name, tick: state.tick, level: state.levelId, player: state.player, vehicle: state.vehicleId });
      screenshotJob = page.screenshot({ path: `${out}/${label}-${name}.png` }).catch(error => errors.push(`screenshot: ${error}`)).finally(() => { captureBusy = false; });
      return true;
    };
    try {
      page.on('pageerror', error => errors.push(String(error)));
      await page.goto(pathToFileURL(entry).href);
      await page.waitForFunction(() => Boolean((window as unknown as { __PROTOTYPE_TEST__?: unknown }).__PROTOTYPE_TEST__));
      await page.screenshot({ path: `${out}/${label}-startup.png` });
      const beforeStart = await readState();
      await page.waitForTimeout(300);
      assert.equal((await readState()).tick, beforeStart.tick, 'start card must not spend the run');
      await page.locator('[data-action="start-run"]').click();
      if (!touch) await page.locator('[data-action="grapple"]').focus();
      for (let sample = 0; Date.now() - started < 115_000; sample++) {
        const state = await readState();
        if (sample % 5 === 0) samples.push({ ms: Date.now() - started, tick: state.tick, level: state.levelId,
          player: state.player, segment: state.segmentIndex, status: state.status, coins: state.coins,
          pickups: state.pickups, combo: state.combo, vehicle: state.vehicleId, sky: state.isSky });
        if (state.levelId === 'night-patrol') {
          pursuitPhases.add(state.chase.phase);
          if (state.lastVehicleOffer?.kind === 'claimed') naturalClaims.add(state.lastVehicleOffer.id);
          if (state.lastVehicleOffer?.kind === 'missed') naturalMisses.add(state.lastVehicleOffer.id);
        }
        if (state.status !== 'playing') {
          await edge(false, state.tick);
          await screenshotJob;
          await page.screenshot({ path: `${out}/${label}-terminal-${reviveCount}.png` });
          if (state.status === 'won' && state.levelId !== 'night-patrol') {
            tutorialCompleted = true;
            await page.locator('[data-action="continue"]').click();
            lastRelease = -999; holdAt = -999;
            if (!touch) await page.locator('[data-action="grapple"]').focus();
            continue;
          }
          const closeMenu = page.locator('[data-action="close-progression"]');
          if (await closeMenu.isVisible()) await closeMenu.click();
          if (state.status === 'failed' && reviveCount === 0 && await page.locator('[data-action="revive"]').isVisible()) {
            reviveCount++;
            await page.locator('[data-action="revive"]').click();
            lastRelease = -999;
            if (!touch) await page.locator('[data-action="grapple"]').focus();
            continue;
          }
          break;
        }
        const anchor = state.anchors.find(item => item.id === state.attachedAnchorId);
        const wantHold = state.vehicleId
          ? state.vehicleId === rides[0] ? state.vehicleTicksRemaining > 100
            : state.vehicleId === rides[2] ? state.vehiclePhase !== 'holding' ? state.tick - lastRelease > 26 : state.player.vy > 0 && state.player.vx >= 240
              : state.player.y > 390
          : anchor ? !(state.player.x > anchor.x + 12 && state.player.vx > 0 && state.player.vy < 60) && state.player.vx >= 0 && state.tick - holdAt < 160
            : state.tick - lastRelease > 20 && (state.player.vy > 0 || state.player.y > 540 || state.inputTransitions === 0);
        await edge(wantHold, state.tick);
        if (held && !state.inputHeld && state.inputTransitions > 0 && state.tick - holdAt > 30) await edge(false, state.tick);
        if (state.vehicleId) {
          const visit = seen.get(state.vehicleId);
          if (visit) visit.lastTick = state.tick;
          else seen.set(state.vehicleId, { firstTick: state.tick, lastTick: state.tick, elapsed: state.elapsed });
        }
        // A join is in view briefly; a ride lasts several seconds. Reserve the
        // screenshot slot for approaching joins rather than losing one while
        // a lower-priority ride screenshot is encoding. Input never stops.
        let reserveForSeam = false;
        if (state.levelId === 'night-patrol') {
          const view = await page.locator('#app').evaluate(element => ({ left: Number((element as HTMLElement).dataset.cameraX), width: Number((element as HTMLElement).dataset.worldViewportWidth) }));
          for (const seam of [8000, 9600, 11200, 12800]) {
            if (seams.has(seam)) continue;
            if (seam > view.left && seam < view.left + view.width * 1.2) reserveForSeam = true;
            if (seam > view.left + view.width * .2 && seam < view.left + view.width * .8) {
              if (shot(`seam-${seam}`, state)) seams.add(seam);
              break;
            }
          }
        }
        if (!reserveForSeam && state.vehicleId && !capturedRides.has(state.vehicleId)
          && shot(`ride-${rides.indexOf(state.vehicleId) + 1}`, state)) capturedRides.add(state.vehicleId);
        if (!reserveForSeam && state.lastVehicleOffer?.kind === 'missed'
          && !capturedMisses.has(state.lastVehicleOffer.id)
          && shot(`missed-${rides.indexOf(state.lastVehicleOffer.id) + 1}`, state)) capturedMisses.add(state.lastVehicleOffer.id);
        // Two *different* real-input journeys are intentional: phone proves
        // all four rides are obtainable and playable; desktop must also show
        // that visibly dodging the halo has a genuine missed outcome.
        // Requiring every path to auto-grant all pickups would be an invalid
        // test that pressures Builder to reintroduce invisible grab boxes.
        const playedAll = rides.every(name => { const v = seen.get(name); return v && v.lastTick - v.firstTick >= 120; });
        const resolvedAll = rides.every(name => naturalClaims.has(name) || naturalMisses.has(name));
        const complete = seams.size === 4 && (touch
          ? playedAll && capturedRides.size === 4
          : resolvedAll && [...naturalClaims].every(name => capturedRides.has(name))
            && [...naturalMisses].every(name => capturedMisses.has(name)));
        // Keep controlling the flight while moving to pause. Releasing a bird
        // during its dive and waiting through CDP reads intentionally loses.
        if (complete && held && state.player.y < 550 && state.player.vy < -80) {
          await page.locator('.hub-settings').click();
          break;
        }
        await page.waitForTimeout(65);
      }
      lifecycle.journey = await readState();
      await edge(false, (await readState()).tick);
      if ((await readState()).status === 'playing' && !(await readState()).paused) await page.locator('.hub-settings').click();
      await screenshotJob;
      assert.equal(tutorialCompleted, true, 'normal input must complete the tutorial');
      for (const ride of rides) {
        assert.ok(naturalClaims.has(ride) || naturalMisses.has(ride), `ordinary journey never resolved world pickup ${ride}`);
        assert.equal(naturalClaims.has(ride) && naturalMisses.has(ride), false, `ride ${ride} cannot be both claimed and missed`);
        if (naturalClaims.has(ride)) {
          assert.ok(seen.has(ride), `claimed ride ${ride} did not activate`);
          assert.ok(seen.get(ride)!.lastTick - seen.get(ride)!.firstTick >= 120, `${ride} must be controllable for at least a simulated second`);
          assert.ok(capturedRides.has(ride), `claimed ${ride} has no natural screenshot`);
        } else assert.equal(seen.has(ride), false, `missed ride ${ride} must never become inventory`);
      }
      assert.equal(seams.size, 4, 'natural route must capture both roof variants and their joins');
      if (touch) {
        assert.deepEqual([...naturalClaims].sort(), [...rides].sort(), 'mobile route must actually acquire all four rides by natural contact');
        assert.equal(capturedRides.size, 4, 'every mobile ride requires actual screenshots');
      } else {
        // The player is free to collect everything; do not force a miss.
        // If a natural miss occurs, however, it must be documented by a
        // screenshot and must never become an unseen inventory grant.
        for (const missed of naturalMisses) assert.ok(capturedMisses.has(missed), `missed ${missed} needs natural screenshot`);
      }
      assert.ok(pursuitPhases.has('alert') || pursuitPhases.has('danger') || pursuitPhases.has('climax'), 'officers must produce visible escalating pursuit');
      assert.equal((await readState()).status, 'playing', 'journey must remain controllable');
      const paused = await readState();
      await page.waitForTimeout(350);
      assert.equal((await readState()).tick, paused.tick, 'pause stops simulation');
      assert.equal(paused.inputHeld, false, 'pause cancels held input');
      lifecycle.pausedTick = paused.tick;
      await page.screenshot({ path: `${out}/${label}-pause.png` });
      await page.reload();
      await page.waitForFunction(() => Boolean((window as unknown as { __PROTOTYPE_TEST__?: unknown }).__PROTOTYPE_TEST__));
      const restored = await readState();
      assert.equal(restored.tick, paused.tick, 'reload restores the exact paused checkpoint');
      assert.equal(restored.distanceMeters, paused.distanceMeters);
      lifecycle.restored = { tick: restored.tick, meters: restored.distanceMeters };
      await page.locator('[data-action="start-run"]').click();
      await page.locator('.hub-settings').click();
      await page.locator('[data-action="finish-patrol"]').click();
      await page.waitForTimeout(300);
      assert.equal((await readState()).status, 'won');
      lifecycle.cashout = await readMeta();
      const claim = page.locator('[data-action="claim-ready-missions"]');
      if (await claim.isVisible()) { await claim.click(); await page.waitForTimeout(100); }
      lifecycle.claimed = await readMeta();
      await page.screenshot({ path: `${out}/${label}-cashout.png` });
      await page.reload();
      await page.waitForFunction(() => Boolean((window as unknown as { __GAME_TEST__?: unknown }).__GAME_TEST__));
      lifecycle.reloaded = await readMeta();
      assert.deepEqual(lifecycle.reloaded, lifecycle.claimed, 'refresh must not duplicate settlement or claims');
      // Complete the actual growth loop instead of checking a shop data table.
      await page.locator('.result-actions [data-action="progression"]').click();
      const closeMenu = page.locator('[data-action="close-progression"]');
      const closeBounds = await closeMenu.boundingBox();
      assert.ok(closeBounds && closeBounds.y >= 0 && closeBounds.y + closeBounds.height <= viewport.height,
        'mobile menu must keep Return reachable without scrolling its header/footer');
      const characterId = '走绳伎';
      const beforeUnlock = await readMeta();
      await page.locator(`[data-action="unlock-character"][data-character-id="${characterId}"]`).click();
      const afterUnlock = await readMeta();
      assert.equal(Number(beforeUnlock.wishfire) - Number(afterUnlock.wishfire), 600);
      await page.locator(`[data-action="select-character"][data-character-id="${characterId}"]`).click();
      await page.screenshot({ path: `${out}/${label}-character-selected.png` });
      await closeMenu.click();
      // Successful cashout uses the visible continue CTA. The failed-run
      // restart button deliberately remains hidden; never force-click it.
      assert.equal((await readState()).status, 'won');
      assert.equal(await page.locator('[data-action="restart"]').isVisible(), false);
      await page.getByRole('button', { name: '再跑一次', exact: true }).click();
      await page.waitForFunction(() => {
        const state = (window as unknown as { __PROTOTYPE_TEST__: { getState(): GrappleState } }).__PROTOTYPE_TEST__.getState();
        return state.status === 'playing' && state.levelId === 'night-patrol';
      });
      await page.locator('.hub-settings').click();
      const nextRun = await readState();
      assert.equal(nextRun.characterId, characterId, 'chosen character is actually used next run');
      assert.equal(nextRun.paused, true);
      assert.equal(nextRun.inputHeld, false);
      assert.ok(nextRun.distanceMeters < paused.distanceMeters, 'replay must start a new patrol, not resume the settled one');
      lifecycle.character = { id: characterId, coinsBefore: beforeUnlock.wishfire, coinsAfter: afterUnlock.wishfire,
        nextLevel: nextRun.levelId, nextRunTick: nextRun.tick, nextRunMeters: nextRun.distanceMeters };
      await page.reload();
      await page.waitForFunction(() => Boolean((window as unknown as { __PROTOTYPE_TEST__?: unknown }).__PROTOTYPE_TEST__));
      const persistedCharacterRun = await readState();
      assert.equal(persistedCharacterRun.characterId, characterId, 'selected character survives refresh');
      assert.equal(persistedCharacterRun.tick, nextRun.tick, 'new run checkpoint survives refresh');
      assert.equal(Number((await readMeta()).wishfire), Number(afterUnlock.wishfire), 'replay and refresh must not refund or charge the character again');
      lifecycle.characterPersisted = true;
      if (touch) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(100);
        assert.equal(await page.locator('#app').getAttribute('data-orientation-blocked'), 'true');
        await page.screenshot({ path: `${out}/${label}-portrait.png` });
        await page.setViewportSize(viewport);
      }
      assert.deepEqual(errors, []);
    } catch (error) {
      failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await screenshotJob;
      await page.screenshot({ path: `${out}/${label}-final.png` }).catch(() => undefined);
      const final = await readState().catch(() => null);
      await context.close();
      const videoPath = `${out}/${label}-journey.webm`;
      await page.video()?.saveAs(videoPath);
      const videoBytes = await readFile(videoPath);
      assert.ok(videoBytes.length > 65_536, `natural journey video empty for ${label}`);
      const videoHash = createHash('sha256').update(videoBytes).digest('hex');
      reports.push({ viewport, inputDevice: touch ? 'touch' : 'keyboard', sha256, errors, input, samples, screenshots,
        seen: Object.fromEntries(seen), naturalClaims: [...naturalClaims], naturalMisses: [...naturalMisses], pursuitPhases: [...pursuitPhases],
        seams: [...seams], reviveCount, tutorialCompleted, lifecycle, final,
        continuousVideo: { path: `${label}-journey.webm`, sha256: videoHash, bytes: videoBytes.length } });
      await writeFile(`${out}/journeys.json`, JSON.stringify({ sha256, method: 'state-observing driver; trusted touch/keyboard/buttons; real browser time; continuous video; no state mutation APIs', failures, reports }, null, 2));
    }
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ sha256, journeys: reports.length, failures, evidence: out }));
assert.deepEqual(failures, [], 'browser gameplay or lifecycle acceptance failed');
