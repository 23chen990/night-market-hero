import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SliceSimulation } from '../src/game-core';
import { getLevelDefinition } from '../src/game-levels';
import { ThreePresentationModel } from '../src/three-presentation';

test('MELON-DEFAULT level one carries three authored softbody specimens on the actual default course', () => {
  const level = getLevelDefinition(1);
  const state = new SliceSimulation(31, 1).getState();
  assert.ok(level.foodStyles.some((style: string) => style === 'melon-jelly'));
  assert.deepEqual(state.sigils.filter((item) => String(item.foodStyle) === 'melon-jelly').map((item) => item.id), ['rune-1', 'rune-2', 'rune-3']);
  assert.equal(new SliceSimulation(31, 2).getState().sigils.some((item) => String(item.foodStyle) === 'melon-jelly'), false);
});

test('MELON-KNIFE default launch records an actual knife plane and velocity for the softbody cut', () => {
  const game = new SliceSimulation(31, 1);
  game.act('flip');
  for (let i = 0; i < 180 && !game.getState().events.some((event) => event.type === 'cut'); i++) game.advanceFrame(1 / 60);
  const state = game.getState();
  const event = state.events.find((item) => item.type === 'cut' && item.targetId === 'rune-1');
  assert.ok(event, 'opening launch must reach the actual first target');
  const impact = (event as unknown as { cutImpact?: { normalX: number; normalY: number; pointX: number; pointY: number; velocityX: number; velocityY: number } }).cutImpact;
  assert.ok(impact, 'rendering must receive the actual cut plane');
  assert.ok(Math.abs(Math.hypot(impact.normalX, impact.normalY) - 1) < 1e-6);
  assert.ok([impact.pointX, impact.pointY, impact.velocityX, impact.velocityY].every(Number.isFinite));
  assert.ok(Math.hypot(impact.velocityX, impact.velocityY) > 0);
  const visual = new ThreePresentationModel().sync(state).cuttables.find((item) => item.id === 'rune-1')!;
  assert.equal(visual.phase, 'cut');
  assert.equal(visual.halves.length, 0, 'softbody path must not substitute prerecorded rigid halves');
});
