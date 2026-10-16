/* global process, console */
/** Independent, exact-HTML real-input proof for a fixed world lantern knot.
 * A browser input trace is needed: passing a unit fixture is not sufficient.
 * No game state mutation, no enlarged invisible pickup and no auto grant.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
assert.equal(files.length, 2, 'skilled baseline and lantern-route reports are required');
const [baseline, lantern] = files.map(file => JSON.parse(readFileSync(file, 'utf8')));
assert.equal(baseline.buildSha256, lantern.buildSha256,
  'lantern and normal skilled input must use the exact same built HTML');
assert.equal(baseline.results?.length, 1);
assert.equal(lantern.results?.length, 1);
const [a, b] = [baseline.results[0], lantern.results[0]];
assert.deepEqual(a.viewport, b.viewport, 'the device viewport must match');
assert.equal(a.inputMode, 'touch');
assert.equal(b.inputMode, 'touch');
assert.equal(a.skilledRoute, true);
assert.equal(b.skilledRoute, true);
assert.equal(b.lanternRoute, true);
assert.deepEqual(b.errors, [], 'browser errors invalidate this evidence');
assert.equal(b.level, 'night-patrol', 'must reach the actual night-market patrol');
assert.ok(b.worldX > 10000, 'must travel naturally to the lantern segment');
const events = new Map(b.encounters);
const named = kind => [...events.keys()].find(key => key.endsWith(':' + kind));
const pulley = named('货运滑索');
const kite = named('纸鸢');
const lanternId = named('灯笼群');
assert.ok(pulley && kite && lanternId, 'real world encounters must all be reached');
assert.equal(events.get(pulley)?.result, 'claimed', 'the opening physical pulley should still be earned');
assert.equal(events.get(kite)?.result, 'missed', 'choosing the low lantern route must forgo the kite');
assert.equal(events.get(lanternId)?.result, 'claimed', 'a fresh actual press must earn the anchored lantern');
assert.ok(b.seenRides.includes('灯笼群'), 'lantern must become an equipped vehicle');
assert.ok(b.screenshotNames?.includes('encounter-6-claimed'),
  'successful lantern instance requires a browser screenshot');
assert.ok(b.screenshotNames?.includes('ride-灯笼群'),
  'lantern must become an observable distinct mounted ride');
const claimedAt = events.get(lanternId)?.tick;
assert.ok(Number.isInteger(claimedAt), 'instance resolution must have a physical tick');
assert.ok(b.inputEdges?.some(edge => edge.action === 'press'
  && edge.tick <= claimedAt && claimedAt - edge.tick <= 26),
  'the lantern must be earned within 26 simulation ticks of a real fresh press');
assert.ok(b.inputEdges?.some(edge => edge.action === 'release'
  && edge.tick < claimedAt && claimedAt - edge.tick <= 180),
  'lantern input must be preceded by an actual release of the old roof rope');
const nearest = b.nearest?.[lanternId];
assert.ok(nearest && nearest.distancePx < 110,
  'actual player trajectory must pass close to the fixed authored lantern');
if (nearest.samplePhase === 'claimed-after-real-press') {
  // No relaxation of the 110px observation bound: a fast browser may capture
  // x=-117px before the physical claim and x=+36px just after. The post-claim
  // frame is valid ONLY if the runtime says a real press itself claimed the
  // exact world instance at the exact same physics tick.
  assert.equal(nearest.enginePressTick, claimedAt,
    'post-claim near-lantern sample must match the exact real input/claim tick');
  assert.ok(b.inputEdges?.some(edge => edge.action === 'press'
    && edge.tick <= nearest.enginePressTick
    && nearest.enginePressTick - edge.tick <= 26),
    'post-claim lantern evidence still requires a recent genuine browser press');
}
console.log(JSON.stringify({
  status: 'LANTERN_REAL_TOUCH_PASS', sha256: lantern.buildSha256,
  worldInstance: lanternId, claimedAtTick: claimedAt,
  inputTransitions: b.inputEdges?.length,
  limits: 'Same-build Chromium simulated touch only; not human or real phone approval.',
}, null, 2));
