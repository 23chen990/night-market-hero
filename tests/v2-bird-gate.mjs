/* global console, process */
/** Independent exact-build Qingluan proof.
 * Requires one natural missed bird and one natural earned bird, both with
 * real touch input and continuous browser video. Never a human playtest.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const files = process.argv.slice(2);
assert.equal(files.length, 2, 'supply regular lantern-route and focused bird-route reports');
const [regular, focused] = files.map(path => JSON.parse(readFileSync(path, 'utf8')));
assert.equal(regular.buildSha256, focused.buildSha256,
  'bird success/miss must use the SAME generated playable HTML');
assert.equal(regular.results?.length, 1);
assert.equal(focused.results?.length, 1);
const [missed, earned] = [regular.results[0], focused.results[0]];
assert.deepEqual(missed.viewport, earned.viewport);
assert.equal(missed.inputMode, 'touch');
assert.equal(earned.inputMode, 'touch');
assert.equal(missed.lanternRoute, true);
assert.equal(earned.birdRoute, true);
assert.equal(earned.skilledRoute, true);
assert.deepEqual(missed.errors, []);
assert.deepEqual(earned.errors, []);
assert.equal(earned.level, 'night-patrol');
assert.ok(earned.worldX > 14780, 'real flight must physically pass the authored bird support');
const earnedLantern = new Map(earned.encounters ?? []);
const lanternInstance = [...earnedLantern.keys()].find(key => key.endsWith(':灯笼群'));
assert.ok(lanternInstance && earnedLantern.get(lanternInstance)?.result === 'missed',
  'the advanced bird route must deliberately forgo the optional lantern to earn rooftop rhythm');
assert.ok((earned.birdApproachTrace ?? []).some(frame =>
  frame.stylishTicks?.length >= 1 && frame.attached !== null),
  'two-release Qingluan preparation must be observable on an actual prior world roof');
const m = new Map(missed.encounters ?? []);
const e = new Map(earned.encounters ?? []);
const id = [...e.keys()].find(key => key.endsWith(':青鸾'));
assert.ok(id, 'real bird encounter missing: do not substitute a virtual stage reward');
assert.match(id, /^[0-9]+:8:[0-9]+:青鸾$/);
assert.equal(m.get(id)?.result, 'missed', 'the same fixed Qingluan must be missable');
assert.equal(e.get(id)?.result, 'claimed',
  'actual stylish roof swings must physically earn the visible bird');
const tick = e.get(id)?.tick;
assert.ok(Number.isInteger(tick));
const stylish = earned.birdClaimPreparations?.[id] ?? [];
assert.ok(stylish.length >= 2, 'the real engine must report TWO qualifying stylish releases');
const qualifying = stylish.filter(t => t <= tick && tick - t <= 1200);
assert.ok(qualifying.length >= 2, 'both stylish releases must precede the same instance claim');
const releases = (earned.inputEdges ?? []).filter(edge => edge.action === 'release');
for (const stylishTick of qualifying.slice(-2)) {
  assert.ok(releases.some(edge => Math.abs(edge.tick - stylishTick) <= 10),
    `engine stylish tick ${stylishTick} must correspond to a genuine browser release edge`);
}
assert.ok(releases.some(edge => edge.tick <= tick && tick - edge.tick <= 80),
  'the final bird contact must follow a recent actual release, not a hidden grant');
assert.ok(earned.seenRides?.includes('青鸾'), 'riding Qingluan must be visible to the browser');
assert.ok(earned.screenshotNames?.some(name => name === 'encounter-8-claimed'),
  'a successful Qingluan encounter must have a genuine captured frame');
assert.ok(earned.screenshotNames?.includes('ride-青鸾'),
  'the mounted bird must appear in a distinct real gameplay screenshot');
assert.ok(earned.birdMount?.observedTicks >= 120,
  'the earned bird must remain controllable for at least 1 second of fixed physics');
console.log(JSON.stringify({ status: 'BIRD_NATURAL_INPUT_PASS',
  sha256: focused.buildSha256, viewport: earned.viewport,
  birdInstance: id, missedAt: m.get(id)?.tick, claimedAt: tick,
  stylishReleaseTicks: qualifying.slice(-2),
  sustainedMountTicks: earned.birdMount.observedTicks,
  caveat: 'Real browser input and trace: not a blind-human, real-device, IAA or native-platform signoff.'
}, null, 2));
