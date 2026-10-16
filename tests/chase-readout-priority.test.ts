import assert from 'node:assert/strict';
import test from 'node:test';
import { chaseReadoutUrgency } from '../src/experience-hud.ts';

test('pursuit warnings reflect actual danger phase and normalized pressure without changing game physics', () => {
  assert.equal(chaseReadoutUrgency('calm', 0.03), 'calm');
  assert.equal(chaseReadoutUrgency('calm', 0.34), 'calm');
  assert.equal(chaseReadoutUrgency('calm', 0.35), 'alert');
  assert.equal(chaseReadoutUrgency('alert', 0.05), 'alert');
  assert.equal(chaseReadoutUrgency('calm', 0.75), 'danger');
  assert.equal(chaseReadoutUrgency('danger', 0.15), 'danger');
  assert.equal(chaseReadoutUrgency('climax', 0), 'danger');
});
