/* global console */
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
const build=createHash('sha256').update(readFileSync('dist/index.html')).digest('hex');
const journeys=JSON.parse(readFileSync('evidence/playable-audit/journeys.json','utf8'));
const pursuit=JSON.parse(readFileSync('evidence/v2-pursuit/pursuit-natural.json','utf8'));
assert.equal(journeys.sha256,build,'normal journey must match exact HTML');
assert.equal(pursuit.sha256,build,'independent capture must match SAME HTML');
assert.deepEqual(journeys.failures,[],'complete natural journeys failed');
assert.ok(journeys.reports?.length===2);
assert.equal(pursuit.passed,true,'natural officer capture was not proven');
assert.ok(pursuit.tutorialCompleted&&pursuit.deliberatelyHeld);
assert.ok(pursuit.input?.some(e=>e.action==='press')&&pursuit.input?.some(e=>e.action==='release'));
const r=pursuit.result;
assert.equal(r?.status,'failed');assert.equal(r?.reason,'caught','falling is not an officer capture');
assert.ok(r.segment>=2&&r.gap<=60&&r.playerY>=r.netTop,'capture must match physical net');
assert.ok(pursuit.chase?.some(e=>['alert','danger','climax'].includes(e.phase)),'missing guard warning');
// A skilled rider may stay outside the alert radius: the threat is
// established by the independent real-touch stalled path, not a forced loss.
for (const report of journeys.reports) {
  const snapshot = report.lifecycle?.journey;
  assert.ok(snapshot?.status === 'playing'
    && snapshot.player.x > 8_000 && snapshot.pursuer.x > 3_000
    && snapshot.inputTransitions >= 10 && snapshot.chase.distance >= 0,
    'complete natural journey must outpace an officer who actually advanced');
}
assert.ok(statSync('evidence/v2-pursuit/officer-caught.png').size>10_000,'missing capture screenshot');
const cv=pursuit.continuousVideo;assert.ok(cv?.bytes>65_536,'missing continuous capture video');
const raw=readFileSync(path.join('evidence/v2-pursuit',cv.path));
assert.equal(raw.length,cv.bytes);
assert.equal(createHash('sha256').update(raw).digest('hex'),cv.sha256);
console.log(JSON.stringify({status:'PURSUIT_MATRIX_PASS',sha256:build,
  escapeJourneys:journeys.reports.length,capture:r.reason,guardDistance:r.gap,
  limits:'Engineering browser evidence only; not independent perceptual or human sign-off.'},null,2));
