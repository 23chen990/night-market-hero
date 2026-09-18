import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGrappleGame } from '../src/game-core.ts';

const root = join(import.meta.dirname, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const main = readFileSync(join(root, 'src/main.ts'), 'utf8');

test('default composition keeps only sparse status and one pursuit signal', () => {
  assert.match(html, /class="run-readout"[^>]*hidden/);
  assert.match(html, /class="journey-meter"[^>]*hidden/);
  assert.match(html, /class="tutorial-rail"[^>]*hidden/);
  assert.match(html, /class="chase-readout sr-only"/);
  assert.match(html, /data-ui="pursuer"/);
  assert.match(html, /data-ui="left-edge-alert"/);
});

test('tutorial stages are world-affordance driven rather than a tutorial card', () => {
  assert.match(html, /class="tutorial-rail"[^>]*hidden/);
  assert.doesNotMatch(html, /tutorial-card/);
  assert.match(main, /drawTutorialAffordance/);
  assert.match(main, /拾取金币/);
  assert.doesNotMatch(main, /布棚救援/);
});

test('ring, talisman, and ad-play item layers are independent visible slots', () => {
  assert.match(html, /data-hub="hub-inventory-ring-top"/);
  assert.match(html, /data-hub="hub-inventory-talisman"/);
  assert.match(html, /data-hub="hub-inventory-play-top"/);
});

test('all player-facing economy strings use 金币', () => {
  assert.doesNotMatch(html, /愿火/);
  assert.doesNotMatch(main, /愿火/);
});

test('fresh tutorial hold/release has a bounded safety window before the first pursuit', () => {
  const game = createGrappleGame(31);
  for (let cycle = 0; cycle < 5 && game.getState().status === 'playing'; cycle += 1) {
    game.act('press');
    game.advanceTicks(36);
    game.act('release');
    game.advanceTicks(36);
  }
  const state = game.getState();
  assert.ok(state.segment === 'safe-tutorial' || state.segment === 'first-pursuit');
  assert.equal(state.status, 'playing');
  assert.ok(state.player.x >= 0, 'tutorial must not eject a first-time player behind the camera');
  assert.ok(state.player.y < state.failY, 'tutorial must keep the first hold/release recoverable');
});
