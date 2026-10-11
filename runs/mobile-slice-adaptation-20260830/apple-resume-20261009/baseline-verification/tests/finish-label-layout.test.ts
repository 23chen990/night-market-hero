import assert from 'node:assert/strict';
import { test } from 'node:test';
import { finishLabelPosition } from '../src/finish-label-layout';

test('finish labels outside the viewport are hidden instead of pinned to an edge', () => {
  const viewport = { width: 390, height: 844 };
  assert.equal(finishLabelPosition({ x: 372, y: 22 }, viewport), null);
  assert.equal(finishLabelPosition({ x: -10, y: 300 }, viewport), null);
});

test('finish labels inside the safe viewport remain anchored to the wall projection', () => {
  const viewport = { width: 390, height: 844 };
  assert.deepEqual(finishLabelPosition({ x: 180, y: 300 }, viewport), { x: 180, y: 300 });
});
