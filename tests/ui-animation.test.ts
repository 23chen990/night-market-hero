import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

type UiAnimationSnapshot = {
  phase: 'idle' | 'playing' | 'settled';
  semanticState: 'hidden' | 'visible';
  progress: number;
  opacity: number;
  translateY: number;
  scale: number;
  interactive: true;
};

type UiAnimationRuntime = {
  preload(loader: (asset: string) => void | Promise<void>): Promise<void>;
  play(name: string, startedAtMs: number): UiAnimationSnapshot;
  sample(nowMs: number): UiAnimationSnapshot;
  getState(): UiAnimationSnapshot;
};

type UiAnimationModule = {
  UI_ANIMATION_STANDARD?: {
    strategy: string;
    assetPolicy: { independentAiInbetweenFrames: boolean; aiKeyPoseLimit: number };
    runtimePolicy: { clock: string; preload: string; swapImageUrlsDuringPlayback: boolean; perFrameDurations: boolean };
    accessibility: { respectPrefersReducedMotion: boolean; reducedMotionFallback: string };
  };
  UI_MOTIONS?: Record<string, { durationMs: number; easing: string }>;
  createUiAnimationRuntime?: (options: { reducedMotion: boolean; requiredAssets: string[] }) => UiAnimationRuntime;
};

const animationModule = await import('../src/ui-animation.ts').catch(() => ({} as UiAnimationModule)) as UiAnimationModule;

function createRuntime(reducedMotion = false): UiAnimationRuntime {
  assert.equal(typeof animationModule.createUiAnimationRuntime, 'function', 'expected the elapsed-time UI animation runtime');
  return animationModule.createUiAnimationRuntime!({ reducedMotion, requiredAssets: ['night-market-vector-ui-atlas'] });
}

async function settleAt(refreshRateHz: number): Promise<UiAnimationSnapshot> {
  const runtime = createRuntime();
  await runtime.preload(() => undefined);
  runtime.play('menu-enter', 0);
  const frameMs = 1_000 / refreshRateHz;
  for (let now = frameMs; now < 320; now += frameMs) runtime.sample(now);
  return runtime.sample(320);
}

describe('uiAnimationStandard runtime contract', () => {
  test('locks key-pose runtime motion policy and covers HUD, menu, overlay, icon, and state transitions', () => {
    const standard = animationModule.UI_ANIMATION_STANDARD;
    assert.ok(standard);
    assert.equal(standard.strategy, 'key-poses-plus-runtime-motion');
    assert.equal(standard.assetPolicy.independentAiInbetweenFrames, false);
    assert.equal(standard.assetPolicy.aiKeyPoseLimit, 4);
    assert.equal(standard.runtimePolicy.clock, 'time-based-requestAnimationFrame');
    assert.equal(standard.runtimePolicy.preload, 'textures-and-atlases-before-first-use');
    assert.equal(standard.runtimePolicy.swapImageUrlsDuringPlayback, false);
    assert.equal(standard.runtimePolicy.perFrameDurations, true);
    assert.equal(standard.accessibility.respectPrefersReducedMotion, true);
    assert.deepEqual(Object.keys(animationModule.UI_MOTIONS ?? {}).sort(), [
      'hud-enter',
      'icon-press',
      'menu-enter',
      'overlay-feedback',
      'state-change',
    ]);
    assert.ok(Object.values(animationModule.UI_MOTIONS ?? {}).every((motion) => motion.easing !== 'linear'));
  });

  test('reaches the exact same semantic final state at 30, 60, and 120 Hz', async () => {
    const snapshots = await Promise.all([30, 60, 120].map(settleAt));
    for (const snapshot of snapshots) {
      assert.deepEqual(snapshot, {
        phase: 'settled',
        semanticState: 'visible',
        progress: 1,
        opacity: 1,
        translateY: 0,
        scale: 1,
        interactive: true,
      });
    }
  });

  test('refuses playback until every declared UI asset has preloaded', async () => {
    const runtime = createRuntime();
    assert.throws(() => runtime.play('hud-enter', 0), /preload/i);
    assert.equal(runtime.getState().semanticState, 'hidden');
    const loaded: string[] = [];
    await runtime.preload((asset) => { loaded.push(asset); });
    assert.deepEqual(loaded, ['night-market-vector-ui-atlas']);
    assert.doesNotThrow(() => runtime.play('hud-enter', 0));
  });

  test('reduced motion uses a short crossfade with no transform and keeps interaction available', async () => {
    const runtime = createRuntime(true);
    await runtime.preload(() => undefined);
    runtime.play('overlay-feedback', 0);
    const settling = runtime.sample(40);
    assert.equal(settling.phase, 'playing');
    assert.ok(settling.opacity > 0 && settling.opacity < 1);
    assert.equal(settling.translateY, 0);
    assert.equal(settling.scale, 1);
    assert.equal(settling.interactive, true);
    assert.deepEqual(runtime.sample(80), {
      phase: 'settled',
      semanticState: 'visible',
      progress: 1,
      opacity: 1,
      translateY: 0,
      scale: 1,
      interactive: true,
    });
  });
});
