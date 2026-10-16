/* global process, console */
/** Strict engineering-only V2 evidence contrast.
 * Usage: node tests/v2-compare-gate.mjs <casual-report.json> <skilled-report.json>
 * Verifies the SAME viewport and SHA, no game-state mutation, stable resolution,
 * and that deliberate rope release earned more than riding the default line.
 * Must never set factory human/perceptual QA to PASS.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
assert.equal(files.length, 2, 'provide casual and skilled evidence reports');
const [casual, skilled] = files.map(file => JSON.parse(readFileSync(file, 'utf8')));
assert.equal(casual.buildSha256, skilled.buildSha256, 'evidence must belong to the same exact HTML');
assert.match(casual.observation, /browser touch\/key input|state-observing/i);
assert.match(skilled.observation, /browser touch\/key input|state-observing/i);
assert.equal(casual.results?.length, 1);
assert.equal(skilled.results?.length, 1);
const [c, s] = [casual.results[0], skilled.results[0]];
assert.deepEqual(c.viewport, s.viewport, 'compare precisely identical device viewports');
assert.equal(c.inputMode, s.inputMode, 'compare same input device');
assert.equal(c.skilledRoute, false);
assert.equal(s.skilledRoute, true);
assert.deepEqual(c.errors, [], 'casual path must not throw browser errors');
assert.deepEqual(s.errors, [], 'skilled path must not throw browser errors');
assert.equal(c.level, 'night-patrol');
assert.equal(s.level, 'night-patrol');
assert.ok(c.worldX > 7000 && s.worldX > 7000, 'both must naturally reach the first two offers');
assert.ok(['playing', 'failed', 'won'].includes(c.finalStatus) && ['playing','failed','won'].includes(s.finalStatus));
const normalize = route => new Map(route.encounters ?? []);
const cm = normalize(c), sm = normalize(s);
assert.ok(cm.size >= 2 && sm.size >= 2, 'two actual challenges per observed path');
for (const [key, value] of [...cm, ...sm]) {
  assert.match(key, /^[0-9]+:[0-9]+:[0-9]+:(货运滑索|纸鸢|灯笼群|青鸾)$/,
    'encounter keys must identify a real single world instance');
  assert.ok(['claimed', 'missed'].includes(value.result));
}
const identity = [...sm.keys()].find(k => k.endsWith(':货运滑索'));
assert.ok(identity, 'first world encounter missing from skilled path');
assert.equal(sm.get(identity)?.result, 'claimed', 'skilled player must earn the pulley using a real release');
assert.equal(cm.get(identity)?.result, 'missed', 'conservative player must physically pass the optional pulley without an automatic grant');
assert.ok(s.seenRides.includes('货运滑索'), 'actual mount and ride must appear in the browser');
assert.ok(s.screenshotNames.some(n => n === 'encounter-2-claimed'), 'need a screenshot of earned ride');
assert.ok(c.screenshotNames.some(n => n === 'encounter-2-missed'), 'need a screenshot of the missed ride');
const a=c.nearest?.[identity], b=s.nearest?.[identity];
assert.ok(a && b && a.distancePx < 120 && b.distancePx < 120,
  'both paths must physically approach the same authored pickup');
// Do not infer the entire conservative approach from the single nearest-X
// frame: a legitimate last-second release may be closer than the earlier
// held rope. Require BOTH a near actual body passage AND a separate, earlier,
// genuinely held world-rope observation near this same fixed instance.
const heldAtPulley = c.heldNearby?.[identity];
assert.ok(heldAtPulley && heldAtPulley.distancePx < 120
  && Math.abs(heldAtPulley.heightDifferencePx) < 145,
'conservative path must pass near the physical pulley with its real roof rope still held');
assert.equal(heldAtPulley.inputHeld, true, 'real browser input must still be held at the near-pulley sample');
assert.equal(heldAtPulley.attached, true, 'real world support, not a hidden grant or teleport');
assert.equal(heldAtPulley.samplePhase, 'available', 'held evidence must PRECEDE encounter resolution');
assert.ok(heldAtPulley.tick <= cm.get(identity)?.tick,
  'near-pulley held evidence cannot be sampled after the encounter resolves');
// The second route is not a larger hidden magnet: holding the actual
// high-roof swing longer generates a physical upward launch into the kite.
const kiteIdentity = [...sm.keys()].find(k => k.endsWith(':纸鸢'));
assert.ok(kiteIdentity && cm.has(kiteIdentity), 'both players must face the SAME authored kite');
assert.equal(cm.get(kiteIdentity)?.result, 'missed', 'ordinary low flight may miss the kite');
assert.equal(sm.get(kiteIdentity)?.result, 'claimed', 'deliberate high swing and release must earn the kite');
const kiteResolvedAt = sm.get(kiteIdentity)?.tick;
assert.ok(Number.isInteger(kiteResolvedAt) && s.inputEdges?.some(edge =>
  edge.action === 'release' && Number.isInteger(edge.engineReleaseTick)
  && edge.requestedTick <= edge.engineReleaseTick
  && edge.engineReleaseTick <= kiteResolvedAt
  && kiteResolvedAt - edge.engineReleaseTick <= 130),
  'a browser release of a REAL roof rope (engine-confirmed tick) must precede the earned kite');
assert.ok(s.seenRides.includes('纸鸢'), 'the actual kite ride must become controllable');
assert.ok(s.screenshotNames.includes('encounter-4-claimed'), 'earned kite requires a visual encounter frame');
const kiteA=c.nearest?.[kiteIdentity], kiteB=s.nearest?.[kiteIdentity];
assert.ok(kiteA && kiteB && kiteA.distancePx < 120 && kiteB.distancePx < 120,
  'both players need a real input-driven approach to the SAME fixed kite socket');
assert.equal(kiteA.inputHeld, true, 'conservative player must visibly keep holding near the kite');
assert.equal(kiteB.inputHeld, false, 'earned kite requires a real released input state');
assert.equal(kiteB.attached, false, 'earned kite must be approached in true free flight');
console.log(JSON.stringify({ status: 'ENGINEERING_CONTRAST_PASS', sha256: casual.buildSha256,
  viewport: c.viewport, casual: Object.fromEntries(cm), skilled: Object.fromEntries(sm),
  limits: 'Not a blind human study, full game experience review, performance certification or platform release.' }, null, 2));
