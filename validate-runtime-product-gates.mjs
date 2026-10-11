import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const workspace = fileURLToPath(new URL('.', import.meta.url));
const gate = JSON.parse(fs.readFileSync(new URL('./runtime-product-gates.json', import.meta.url), 'utf8'));
const required = ['startup','tutorial','tutorial-settlement','night-patrol','segment-crossing','open-checkpoint','death-settlement','replay'];
if (gate.schemaVersion !== 1 || gate.defaultEntrypoint !== 'src/main.ts') throw new Error('invalid runtime gate header');
if (gate.targetWorkspace !== 'runs/mobile-chart-adaptation-20260830/workspace/night-market-hero') throw new Error('runtime gate belongs to another workspace');
if (JSON.stringify(gate.journey) !== JSON.stringify(required)) throw new Error('incomplete default journey');
if (gate.legacyBehavior.status === 'default-path') throw new Error('legacy behavior blocks release');
if (Object.values(gate.productSystems).some((value) => value !== true)) throw new Error('runtime product system missing');
for (const file of gate.runtimeWiredEntrypoints) {
  if (!fs.existsSync(path.resolve(workspace, file))) throw new Error(`runtime entrypoint missing: ${file}`);
}

if (gate.checkpointRules.collisionEnabled !== false || gate.checkpointRules.rewardsPerSegmentPerRun !== 1) throw new Error('invalid open checkpoint rules');

// The declaration proves wiring only. Current-build natural and perceptual
// reports decide whether the product journey has actually been observed.
const blockers = [];
const buildPath = path.resolve(workspace, 'dist/index.html');
const buildHash = fs.existsSync(buildPath)
  ? createHash('sha256').update(fs.readFileSync(buildPath)).digest('hex')
  : null;
if (!buildHash) blockers.push('Current build is missing');
const reports = [
  ['runtime-product-gate.json', (report) => report.buildHash],
  ['qa-natural-journey-report.json', (report) => report.naturalFlow?.buildHash],
  ['perceptual-qa-report.json', (report) => report.buildHash],
];
for (const [name, reportedHash] of reports) {
  const file = path.resolve(workspace, gate.qaEvidenceDirectory, name);
  if (!fs.existsSync(file)) {
    blockers.push(`Current-build QA evidence missing: ${name}`);
    continue;
  }
  const report = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!buildHash || reportedHash(report) !== buildHash) blockers.push(`QA build hash mismatch: ${name}`);
  if (report.passed !== true) blockers.push(`QA remains blocked: ${name}`);
}
console.log(JSON.stringify({
  structurePassed: true, passed: blockers.length === 0, productGatePassed: blockers.length === 0, evidenceStatus: gate.evidenceStatus, blockers,
  buildHash, journey: gate.journey.length, wired: gate.runtimeWiredEntrypoints.length,
}));
