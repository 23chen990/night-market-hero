import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  V36RequestObservation,
  collectionErrorsForRuntime,
  isV36ResourceReference,
} from '../src/dev-render-observation.ts';

test('recognizes the real v36 key and fullheight URL marker', () => {
  assert.equal(isV36ResourceReference('night-city-rooftops-transition-v36', 'https://example.test/other.png'), true);
  assert.equal(isV36ResourceReference('ordinary-key', '/assets/rooftops-transition-v36-fullheight.png'), true);
  assert.equal(isV36ResourceReference('ordinary-key', '/assets/ordinary.png'), false);
});

test('does not turn an unstarted request observation into a false result', () => {
  const observation = new V36RequestObservation();
  const measurement = observation.read();
  assert.equal(measurement.status, 'NOT_MEASURED');
  assert.equal('value' in measurement, false);
});

test('reports a measured negative only after the adapter collection window closes', () => {
  const observation = new V36RequestObservation();
  observation.begin('renderer preload adapter calls');
  observation.record('ordinary-key', '/assets/ordinary.png');
  observation.complete();
  assert.deepEqual(observation.read(), {
    status: 'MEASURED',
    value: false,
    scope: 'renderer preload adapter calls',
    observedCallCount: 1,
  });
});

test('reports collection failure without a boolean fallback', () => {
  const observation = new V36RequestObservation();
  observation.begin('renderer preload adapter calls');
  observation.fail('adapter threw before the collection window closed');
  const measurement = observation.read();
  assert.equal(measurement.status, 'FAILED');
  assert.equal('value' in measurement, false);
  assert.equal(measurement.reason, 'adapter threw before the collection window closed');
});

test('turns load, console, and page errors into explicit collection failures', () => {
  assert.deepEqual(collectionErrorsForRuntime({ loadFailures: 1, consoleErrors: 0, pageErrors: 0 }), ['Phaser load failures: 1']);
  assert.deepEqual(collectionErrorsForRuntime({ loadFailures: 0, consoleErrors: 2, pageErrors: 0 }), ['console errors: 2']);
  assert.deepEqual(collectionErrorsForRuntime({ loadFailures: 0, consoleErrors: 0, pageErrors: 3 }), ['page errors: 3']);
});
