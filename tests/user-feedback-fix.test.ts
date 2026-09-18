import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = join(import.meta.dirname, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const main = readFileSync(join(root, 'src/main.ts'), 'utf8');
const core = readFileSync(join(root, 'src/game-core.ts'), 'utf8');

test('player-facing settlement copy uses coins, never the legacy currency name', () => {
  assert.doesNotMatch(html, /愿火/);
  assert.doesNotMatch(main, /愿火/);
  assert.match(html, /再得 30 金币/);
});

test('first-run tutorial exposes readable staged affordances including coin pickup and canopy rescue', () => {
  assert.match(html, /data-ui="tutorial-stage"/);
  assert.match(main, /拾取金币/);
  assert.doesNotMatch(main, /布棚救援/);
  assert.match(main, /tutorialStage/);
});

test('beam-hung net has an explicit telegraph/aim/travel sequence and predicted target', () => {
  assert.match(core, /phase:.*'raise'/);
  assert.match(core, /phase:.*'aim'/);
  assert.match(core, /phase:.*'travel'/);
  assert.match(core, /phase:.*'land'/);
  assert.match(core, /predictedTarget/);
  assert.match(core, /progress < 0\.25 \? 'aim'/);
});
