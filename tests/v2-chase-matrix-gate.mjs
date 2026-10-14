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
assert.ok(journeys.reports.some(report=>(report.chaseTimeline??[]).some((phase,i,a)=>
  ['alert','danger','climax'].includes(phase.phase)&&a.slice(i+1).some(end=>
    end.phase==='safe'&&end.reviveCount===phase.reviveCount
      &&end.inputTransitions>phase.inputTransitions))),'normal input should show chase escape without revive');
assert.ok(statSync('evidence/v2-pursuit/officer-caught.png').size>10_000,'missing capture screenshot');
const cv=pursuit.continuousVideo;assert.ok(cv?.bytes>65_536,'missing continuous capture video');
const raw=readFileSync(path.join('evidence/v2-pursuit',cv.path));
assert.equal(raw.length,cv.bytes);
assert.equal(createHash('sha256').update(raw).digest('hex'),cv.sha256);
console.log(JSON.stringify({status:'PURSUIT_MATRIX_PASS',sha256:build,
  escapeJourneys:journeys.reports.length,capture:r.reason,guardDistance:r.gap,
  limits:'Engineering browser evidence only; not independent perceptual or human sign-off.'},null,2));
