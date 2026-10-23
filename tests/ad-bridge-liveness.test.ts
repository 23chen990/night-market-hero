import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InjectedAdProvider, NoopAdProvider, createTapTapAdProvider } from '../src/ads.ts';

test('an unresolved rewarded bridge releases the caller and rejects late completion', async () => {
  let finish!: (value: { status: 'completed' }) => void;
  const provider = new InjectedAdProvider({
    showRewarded: () => new Promise(resolve => { finish = resolve; }),
    showInterstitial: async () => ({ status: 'unavailable' }),
  }, 20);
  const result = await provider.showRewarded('revive');
  assert.deepEqual(result, { status: 'failed' });
  finish({ status: 'completed' });
  await Promise.resolve();
  assert.deepEqual(result, { status: 'failed' }, 'a timed-out request cannot become a reward later');
});

test('an unresolved interstitial bridge also has a bounded wait', async () => {
  const provider = new InjectedAdProvider({
    showRewarded: async () => ({ status: 'unavailable' }),
    showInterstitial: () => new Promise(() => undefined),
  }, 20);
  assert.deepEqual(await provider.showInterstitial('natural-transition'), { status: 'failed' });
});

test('configured but unavailable bridges do not advertise live ads', () => {
  assert.equal(new NoopAdProvider().available, false);
  assert.equal(createTapTapAdProvider({ tap: {}, createBridge: () => null }).available, false);
  assert.equal(createTapTapAdProvider({ tap: {}, createBridge: () => {
    throw new Error('SDK not ready');
  } }).available, false);
  assert.equal(new InjectedAdProvider({
    showRewarded: async () => ({ status: 'completed' }),
    showInterstitial: async () => ({ status: 'shown' }),
  }).available, true);
});

test('a healthy bridge settles immediately without waiting for the timeout', async () => {
  const provider = new InjectedAdProvider({
    showRewarded: async () => ({ status: 'completed' }),
    showInterstitial: async () => ({ status: 'shown' }),
  }, 5000);
  assert.deepEqual(await provider.showRewarded('revive'), { status: 'completed' });
  assert.deepEqual(await provider.showInterstitial('natural-transition'), { status: 'shown' });
});
