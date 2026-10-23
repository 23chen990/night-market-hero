import assert from 'node:assert/strict';
import test from 'node:test';
import { createGrappleGame, type GrappleState } from '../src/game-core.ts';
import { controlCue } from '../src/experience-director.ts';
import { hudCopyPriority } from '../src/experience-hud.ts';

function patrol(): GrappleState {
  const game = createGrappleGame(32, { marketGates: false, terrainMode: 'panorama', guidedExperience: true });
  game.restartEndless(32);
  return game.getState();
}

test('an imminent unroped fall takes priority over every optional vehicle approach', () => {
  const state = patrol();
  state.player = { ...state.player, x: 5000, y: 770, vx: 370, vy: 320 };
  state.attachedAnchorId = null;
  state.inputHeld = false;
  for (const id of ['货运滑索', '纸鸢', '灯笼群', '青鸾'] as const) {
    state.vehicleOffers = [{ id, x: 5100, y: 500, radiusY: 100, segment: 4, status: 'available' }];
    const before = JSON.stringify(state);
    const cue = controlCue(state);
    assert.equal(cue.tone, 'danger', `${id}: optional rewards must not conceal the falling warning`);
    assert.match(cue.title, /按住/);
    assert.doesNotMatch(cue.title, /松手|青鸾考验|资格/);
    assert.equal(hudCopyPriority(state, cue, 'alert').quickAction, 'press');
    assert.equal(JSON.stringify(state), before, 'coaching cannot auto-save or alter player physics');
  }
});

test('low rescue coaching respects a held input and never asks for a second press', () => {
  const state = patrol();
  state.player = { ...state.player, y: 790, vx: 350, vy: 410 };
  state.inputHeld = true;
  state.attachedAnchorId = null;
  const cue = controlCue(state);
  assert.equal(cue.tone, 'danger');
  assert.match(cue.title, /保持按住/);
  assert.doesNotMatch(cue.title, /重新|再按|快按/);
});

test('a low upward flight and an active ride keep their own actionable controls', () => {
  const state = patrol();
  state.player = { ...state.player, y: 760, vy: -270 };
  state.vehicleOffers = [{ id: '灯笼群', x: state.player.x + 120, y: 675,
    radiusY: 100, segment: 6, status: 'available' }];
  state.inputHeld = false;
  state.attachedAnchorId = null;
  assert.match(controlCue(state).title, /接住灯绳结/,
    'an upward pass inside the visible lantern band can still be deliberately claimed');
  state.vehicleId = '青鸾';
  state.player.vy = 420;
  assert.match(controlCue(state).title, /按住振翅/,
    'a mounted bird must not be instructed to grab an ordinary rope');
});

test('preparing for Qingluan retains the actual scoreable release timing', () => {
  const state = patrol();
  state.tick = 400;
  state.player = { ...state.player, x: 5000, y: 480, vx: 400, vy: -190 };
  state.anchors = [{ ...state.anchors[0]!, id: 'visible-preparation-roof', x: 4950, y: 230 }];
  state.attachedAnchorId = 'visible-preparation-roof';
  state.inputHeld = true;
  state.vehicleOffers = [{ id: '青鸾', x: 6500, y: 400, radiusY: 92, segment: 8, status: 'available' }];
  state.stylishReleaseTicks = [310];
  const cue = controlCue(state);
  assert.match(cue.title, /现在松手/);
  assert.match(cue.title, /1\/2/);
  assert.equal(hudCopyPriority(state, cue, 'calm').quickAction, 'release');
  state.player.vx = 160;
  assert.doesNotMatch(controlCue(state).title, /现在松手/,
    'the preparation counter must never fabricate a scoreable release window');
});

test('a real rope about to reverse cannot be masked by optional vehicle preparation', () => {
  const state = patrol();
  const anchor = state.anchors[0]!;
  state.player = { ...state.player, x: anchor.x + 44, y: 460, vx: 205, vy: -35 };
  state.attachedAnchorId = anchor.id;
  state.inputHeld = true;
  state.chase.distance = 280;
  for (const id of ['货运滑索', '纸鸢', '灯笼群', '青鸾'] as const) {
    state.vehicleOffers = [{ id, x: state.player.x + 500, y: 510,
      radiusY: 100, segment: 4, status: 'available' }];
    const cue = controlCue(state);
    assert.equal(cue.tone, 'danger');
    assert.match(cue.title, /赶紧松手/, `${id}: the real reversal must outrank the pickup advertisement`);
    assert.equal(hudCopyPriority(state, cue, 'danger').quickAction, 'release');
  }
});
