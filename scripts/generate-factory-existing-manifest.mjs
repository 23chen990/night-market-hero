/* global process, console */
/* Read-only, hash-bound inputs for the separate factory review.
 * Never fabricate independent perceptual or human approvals from CI logs. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const delivery = path.join(root, 'delivery');
mkdirSync(delivery, { recursive: true });
const gap = 'delivery/missing-independent-evidence.txt';
if (!existsSync(path.join(root, gap))) {
  writeFileSync(path.join(root, gap),
    'BLOCKED: independent real-device, perceptual or natural-input evidence was not supplied.\n');
}
function readJson(relative) {
  try { return JSON.parse(readFileSync(path.join(root, relative), 'utf8')); }
  catch { return null; }
}
function bound(relative, kind) {
  const file = existsSync(path.join(root, relative)) ? relative : gap;
  const bytes = readFileSync(path.join(root, file));
  return {
    path: file,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    kind: file === gap ? 'log' : kind,
  };
}
function record(id, dimension, objectType, stateBranch, rendererPath, status, observed, evidence, viewport = [844, 390]) {
  return {
    id, dimension, objectType, stateBranch, rendererPath,
    viewport: { width: viewport[0], height: viewport[1] },
    expected: id + ' must be experienced, visible and attributable to real player input',
    observed, status,
    // Evidence captured by the same project can never self-sign perceptual QA.
    reviewer: 'automated',
    evidence,
  };
}
const journeys = readJson('evidence/playable-audit/journeys.json');
const safety = readJson('evidence/playable-audit/safety.json');
const staticReport = readJson('delivery/static-result.json');
const browserReport = readJson('delivery/browser-result.json');
const build = bound('dist/index.html', 'report');
const evidenceCurrent = journeys && journeys.sha256 === build.sha256 &&
  journeys.reports?.length === 2 && journeys.failures?.length === 0;
const phone = journeys?.reports?.find(item => item.viewport?.width === 844);
const desktop = journeys?.reports?.find(item => item.viewport?.width === 1280);
const rides = ['货运滑索', '纸鸢', '灯笼群', '青鸾'];
const phoneRides = evidenceCurrent && rides.every(name => phone?.naturalClaims?.includes(name) &&
  phone?.seen?.[name]?.lastTick - phone?.seen?.[name]?.firstTick >= 120);
const realMiss = evidenceCurrent && desktop?.naturalMisses?.length > 0 &&
  desktop.naturalMisses.every(name => !desktop.seen?.[name]);
const browserOk = evidenceCurrent && browserReport?.naturalJourneyExit === 0;
const staticOk = !!staticReport &&
  ['lint', 'typecheck', 'unitTests', 'build'].every(key => staticReport[key] === 0);
const safetyOk = safety?.passed === true;
const lifecycleOk = browserOk &&
  journeys.reports.every(item => item.lifecycle?.characterPersisted === true);
// A guard capture is a *natural* result only if the exact browser driver
// observed it before a revive and preserved the screenshot and input trace.
const naturalCapture = browserOk && journeys.reports.flatMap(item => item.lifecycle?.naturalFailures ?? [])
  .find(item => item.reason === 'caught' && item.inputTransitions > 0
    && item.playerY >= item.netUpperY && item.guardDistance < 120
    && item.screenshot && existsSync(path.join(root, 'evidence/playable-audit', item.screenshot)));
const naturalEscape = browserOk && journeys.reports.some(report => {
  const timeline = report.chaseTimeline ?? [];
  return timeline.some((start, index) => ['alert', 'danger', 'climax'].includes(start.phase)
    && timeline.slice(index + 1).some(end => end.phase === 'safe'
      && end.reviveCount === start.reviveCount
      && end.inputTransitions > start.inputTransitions
      && end.distance > start.distance + 60));
});

const trace = bound('evidence/playable-audit/journeys.json', 'trace');
const phoneVideo = bound('evidence/playable-audit/844x390-journey.webm', 'video');
const desktopVideo = bound('evidence/playable-audit/1280x720-journey.webm', 'video');
const safetyTrace = bound('evidence/playable-audit/safety.json', 'trace');
const rows = [
  record('core-action', 'coreExperience', 'grapple', 'normal-input',
    'src/game-core.ts', browserOk ? 'PASS' : 'BLOCKED',
    browserOk ? 'Two normal-input browser journeys recorded; human learnability remains unapproved'
      : 'Exact-build natural journey missing or failing', [trace, phoneVideo]),
  record('pursuit-caught', 'coreExperience', 'officers', 'attributable-net-contact',
    'src/game-core.ts', naturalCapture ? 'PASS' : 'BLOCKED',
    naturalCapture ? 'Recorded real-input guard contact with player/net positions and terminal screenshot; independent visual sign-off outstanding'
      : 'No natural-input officer capture with screenshot and contact height evidence',
    [trace, naturalCapture
      ? bound('evidence/playable-audit/' + naturalCapture.screenshot, 'screenshot') : desktopVideo]),
  record('pursuit-escape', 'coreExperience', 'officers', 'escape-after-warning',
    'src/game-core.ts', naturalEscape ? 'PASS' : 'BLOCKED',
    naturalEscape ? 'An input-driven chase phase returned to safe without intervening revive; perceptual sign-off outstanding'
      : 'No attributable danger-to-safe progression with continuous input and no revive',
    [trace, phoneVideo]),
  record('pickup-contact', 'coreExperience', 'vehicle', 'visible-halo-contact',
    'src/ride-renderer.ts', phoneRides ? 'PASS' : 'BLOCKED',
    phoneRides ? 'Phone journey touched and controlled all four world pickups'
      : 'World pickups not all reached and controlled for 120 ticks', [trace, bound('evidence/playable-audit/844x390-ride-1.png', 'screenshot')]),
  record('pickup-missed', 'coreExperience', 'vehicle', 'avoid-halo',
    'src/ride-renderer.ts', realMiss ? 'PASS' : 'BLOCKED',
    realMiss ? 'Desktop naturally missed an optional halo without inventory grant'
      : 'Separate natural miss journey not yet proven', [trace, desktopVideo], [1280, 720]),
  record('camera-motion', 'visualUx', 'camera', 'full-speed-transition',
    'src/camera-layout.ts', 'BLOCKED',
    'Continuous video exists but motion/jerk comfort requires an independent reviewer',
    [trace, phoneVideo]),
  record('seam-motion', 'visualUx', 'city-architecture', 'four-full-scroll-crossings',
    'src/night-city-renderer.ts', 'BLOCKED',
    'Static screenshots and video hashes cannot themselves prove pixel/architectural continuity',
    [phoneVideo, desktopVideo]),
  record('failure-revive', 'functionality', 'failure-overlay', 'free-revive',
    'src/experience-hud.ts', safetyOk ? 'PASS' : 'BLOCKED',
    safetyOk ? 'Browser normal failure and revival QA passed' : 'Safety QA missing or failed',
    [safetyTrace]),
  record('settlement-replay', 'productIntegrity', 'wallet-and-save', 'cashout-reload-replay',
    'src/main.ts', lifecycleOk ? 'PASS' : 'BLOCKED',
    lifecycleOk ? 'Browser claims, character purchase and replay persisted across reload'
      : 'Exact-build settlement cycle missing or failed', [trace, bound('delivery/browser-result.json', 'report')]),
  record('pressure-curve', 'contentDifficulty', 'guard', 'early-mid-late',
    'src/game-core.ts', 'BLOCKED',
    'Increasing difficulty and readable decision pressure not blind-play approved', [trace]),
  record('real-device', 'performanceCompatibility', 'mobile', 'landscape-hardware',
    'src/main.ts', 'BLOCKED',
    'Headless browser is not real mobile frame pacing, thermal or memory evidence', [phoneVideo]),
  record('platform-packaging', 'releaseEngineering', 'platform', 'wechat-douyin-taptap',
    '.github/workflows/night-patrol-repair-gates.yml', 'BLOCKED',
    staticOk ? 'Web build passed; platform packages and real ads unverified' : 'Web build failed or missing',
    [bound('delivery/static-result.json', 'report')]),
];
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', timeout: 5_000 }).trim();
const manifest = {
  schemaVersion: 1,
  repository: '23chen990/night-market-hero',
  commit,
  workspace: root,
  build,
  profile: 'action-runner',
  requiredCaseIds: ['core-action', 'pursuit-caught', 'pursuit-escape', 'pickup-contact',
    'pickup-missed', 'camera-motion', 'seam-motion', 'failure-revive', 'settlement-replay'],
  cases: rows,
  // HumanPlaytest is intentionally absent. A robot cannot approve itself.
};
writeFileSync(path.join(delivery, 'factory-existing-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(path.join(delivery, 'factory-evidence-state.json'), JSON.stringify({
  commit, buildHash: build.sha256, browserOk, staticOk, phoneRides, realMiss,
  safetyOk, lifecycleOk, naturalCapture: Boolean(naturalCapture), naturalEscape,
  pendingIndependent: rows.filter(row => row.status !== 'PASS').map(row => row.id),
}, null, 2) + '\n');
console.log('Factory manifest generated; full release quality intentionally remains BLOCKED without independent evidence.');
