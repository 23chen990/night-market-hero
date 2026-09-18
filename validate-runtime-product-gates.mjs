import fs from 'node:fs';
const gate = JSON.parse(fs.readFileSync(new URL('./runtime-product-gates.json', import.meta.url), 'utf8'));
const required = ['startup','tutorial','tutorial-settlement','night-patrol','segment-crossing','checkpoint-gate','death-settlement','replay'];
if (gate.schemaVersion !== 1 || gate.defaultEntrypoint !== 'src/main.ts') throw new Error('invalid runtime gate header');
if (JSON.stringify(gate.journey) !== JSON.stringify(required)) throw new Error('incomplete default journey');
if (gate.legacyBehavior.status === 'default-path') throw new Error('legacy behavior blocks release');
if (Object.values(gate.productSystems).some((value) => value !== true)) throw new Error('runtime product system missing');
console.log(JSON.stringify({ passed: true, journey: gate.journey.length, wired: gate.runtimeWiredEntrypoints.length }));
