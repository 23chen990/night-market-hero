import assert from 'node:assert/strict';
import { test } from 'node:test';
import { blockCutMotion, sigilCutMotion } from '../src/three-presentation';

test('CUT-MOTION-011 starts at the centered blade plane and separates sigil halves continuously', () => {
  const impact = sigilCutMotion(0, -1);
  const early = sigilCutMotion(0.12, -1);
  const readable = sigilCutMotion(0.24, -1);
  const settled = sigilCutMotion(0.72, -1);
  const otherSide = sigilCutMotion(0.24, 1);

  assert.equal(impact.position[0], 0, 'halves must meet at the blade center on impact');
  assert.equal(impact.position[1], 0, 'the cut starts on the original object center');
  assert.equal(impact.position[2], 0, 'the cut starts without a depth jump');
  assert.ok(Math.abs(early.position[0]) > 0.08, 'the first visible frame must already show motion');
  assert.ok(Math.abs(readable.position[0]) > Math.abs(early.position[0]), 'separation must keep moving after the cut');
  assert.ok(Math.abs(readable.position[0]) < 0.42, 'the readable opening must not explode apart');
  assert.ok(Math.abs(settled.position[0]) > 0.46, 'the completed split must remain clearly visible');
  assert.ok(readable.position[0] < 0 && otherSide.position[0] > 0, 'halves must travel to opposite sides of the blade');
  assert.ok(Math.abs(readable.rotationDepth) > Math.abs(early.rotationDepth), 'cut faces must rotate into view continuously');
});

test('CUT-MOTION-012 adds a visible but bounded plane-aligned release to block halves', () => {
  const impact = blockCutMotion(0, -1);
  const early = blockCutMotion(0.12, -1);
  const readable = blockCutMotion(0.24, -1);
  const settled = blockCutMotion(0.72, -1);
  const otherSide = blockCutMotion(0.24, 1);

  assert.equal(impact.position[0], 0, 'block halves must start on the blade center');
  assert.ok(Math.abs(early.position[0]) > 0.015, 'block release must be visible immediately');
  assert.ok(Math.abs(readable.position[0]) > Math.abs(early.position[0]), 'block release must remain continuous');
  assert.ok(Math.abs(settled.position[0]) <= 0.2, 'block release must stay bounded');
  assert.ok(readable.position[0] < 0 && otherSide.position[0] > 0, 'block halves must split to opposite sides');
  assert.ok(Math.abs(settled.rotationDepth) <= 1.05, 'block rotation must remain readable instead of spinning explosively');
});
