import { describe, expect, it } from 'vitest';
import { loadContract } from './contracts';

type Motion = typeof import('../src/ui/motion');

type CharacterMotionState = {
  elapsedMs: number;
  direction: 'front' | 'back' | 'side';
  moving: boolean;
  textureKey: 'otter-walk-front' | 'otter-walk-back' | 'otter-walk-side';
  frame: number;
  flipX: boolean;
};

type CharacterMotionApi = {
  CHARACTER_WALK_FRAME_DURATION_MS: number;
  CHARACTER_WALK_FRAME_SEQUENCE: readonly number[];
  createCharacterMotionState: () => CharacterMotionState;
  advanceCharacterMotion: (
    state: CharacterMotionState,
    elapsedMs: number,
    movement: { x: number; y: number },
    reducedMotion: boolean,
  ) => CharacterMotionState;
};

async function loadCharacterMotion() {
  const module = await loadContract<Motion>(() => import('../src/ui/motion'), 'motion');
  const candidate = module as unknown as Partial<CharacterMotionApi>;
  expect(candidate.createCharacterMotionState, 'character motion state factory is required').toBeTypeOf('function');
  expect(candidate.advanceCharacterMotion, 'character motion sampler is required').toBeTypeOf('function');
  expect(candidate.CHARACTER_WALK_FRAME_SEQUENCE, 'stable walk sequence is required').toBeInstanceOf(Array);
  return candidate as CharacterMotionApi;
}

describe('uiAnimationStandard runtime contract', () => {
  it.each([30, 60, 120])('reaches the same semantic final state at %s Hz', async (hz) => {
    const motion = await loadContract<Motion>(() => import('../src/ui/motion'), 'motion');
    let state = motion.createMotionState('hidden', 'visible', 180);
    const frameMs = 1_000 / hz;
    let elapsed = 0;
    while (elapsed < 400) {
      const delta = Math.min(frameMs, 400 - elapsed);
      state = motion.advanceMotion(state, delta, false);
      elapsed += delta;
    }
    expect({ semantic: state.semantic, progress: state.progress }).toEqual({ semantic: 'visible', progress: 1 });
  });

  it('blocks first visibility and playback until every texture is preloaded', async () => {
    const motion = await loadContract<Motion>(() => import('../src/ui/motion'), 'motion');
    const loaded: string[] = [];
    const gate = new motion.AssetPreloadGate(['background', 'character'], async (asset) => {
      loaded.push(asset);
    });
    expect(gate.requestPlayback()).toBe(false);
    expect(gate.visible).toBe(false);
    await gate.preload();
    expect(loaded).toEqual(['background', 'character']);
    expect(gate.requestPlayback()).toBe(true);
    expect(gate.visible).toBe(true);
  });

  it('uses an immediate semantic fallback when reduced motion is preferred', async () => {
    const motion = await loadContract<Motion>(() => import('../src/ui/motion'), 'motion');
    let state = motion.createMotionState('closed', 'open', 240);
    state = motion.advanceMotion(state, 1, true);
    expect(state).toMatchObject({ semantic: 'open', progress: 1, complete: true });
    expect(motion.resolveMotionTokens(true).panelTransition).toBe(0);
  });

  it('uses per-frame durations on one stable atlas rather than render-tick URL swaps', async () => {
    const motion = await loadContract<Motion>(() => import('../src/ui/motion'), 'motion');
    const sequence = motion.createKeyPoseSequence('/assets/character.svg', [120, 180, 140]);
    expect(sequence.textureUrl).toBe('/assets/character.svg');
    expect(motion.sampleKeyPose(sequence, 119)).toBe(0);
    expect(motion.sampleKeyPose(sequence, 120)).toBe(1);
    expect(motion.sampleKeyPose(sequence, 300)).toBe(2);
    expect(sequence.frameDurationsMs).toEqual([120, 180, 140]);
  });

  it.each([30, 60, 120])('keeps character animation semantic state deterministic at %s Hz', async (hz) => {
    const motion = await loadCharacterMotion();
    let state = motion.createCharacterMotionState();
    const durationMs = 2_000;
    const frameMs = 1_000 / hz;
    let elapsedMs = 0;
    while (elapsedMs < durationMs) {
      const delta = Math.min(frameMs, durationMs - elapsedMs);
      state = motion.advanceCharacterMotion(state, delta, { x: 1, y: 0 }, false);
      elapsedMs += delta;
    }
    expect({ direction: state.direction, moving: state.moving, textureKey: state.textureKey, frame: state.frame, flipX: state.flipX })
      .toEqual({ direction: 'side', moving: true, textureKey: 'otter-walk-side', frame: 4, flipX: false });
  });

  it('uses all eight frames in a wrap-stable adjacent ping-pong loop', async () => {
    const motion = await loadCharacterMotion();
    const sequence = [...motion.CHARACTER_WALK_FRAME_SEQUENCE];
    expect([...new Set(sequence)].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    const wrapped = [...sequence, sequence[0]!];
    for (let index = 1; index < wrapped.length; index += 1) {
      expect(Math.abs(wrapped[index]! - wrapped[index - 1]!)).toBeLessThanOrEqual(1);
    }
    let state = motion.createCharacterMotionState();
    state = motion.advanceCharacterMotion(
      state,
      motion.CHARACTER_WALK_FRAME_DURATION_MS * sequence.length,
      { x: 1, y: 0 },
      false,
    );
    expect(state.frame).toBe(sequence[0]);
  });

  it('selects direction from movement and flips only the side atlas', async () => {
    const motion = await loadCharacterMotion();
    const initial = motion.createCharacterMotionState();
    expect(motion.advanceCharacterMotion(initial, 84, { x: 0, y: 1 }, false)).toMatchObject({ direction: 'front', textureKey: 'otter-walk-front', flipX: false });
    expect(motion.advanceCharacterMotion(initial, 84, { x: 0, y: -1 }, false)).toMatchObject({ direction: 'back', textureKey: 'otter-walk-back', flipX: false });
    expect(motion.advanceCharacterMotion(initial, 84, { x: -1, y: 0 }, false)).toMatchObject({ direction: 'side', textureKey: 'otter-walk-side', flipX: true });
  });

  it('holds the matching full-body front key pose when idle or reduced motion is requested', async () => {
    const motion = await loadCharacterMotion();
    let state = motion.createCharacterMotionState();
    state = motion.advanceCharacterMotion(state, 420, { x: 1, y: 0 }, false);
    expect(state.moving).toBe(true);
    state = motion.advanceCharacterMotion(state, 16, { x: 0, y: 0 }, false);
    expect(state).toMatchObject({ moving: false, textureKey: 'otter-walk-front', frame: 0, flipX: false, elapsedMs: 0 });
    state = motion.advanceCharacterMotion(state, 420, { x: 1, y: 0 }, true);
    expect(state).toMatchObject({ moving: false, textureKey: 'otter-walk-front', frame: 0, flipX: false, elapsedMs: 0 });
  });

  it('keeps legacy save normalization independent from visual-only animation state', async () => {
    const motion = await loadCharacterMotion();
    const simulation = await import('../src/game/simulation');
    const saved = simulation.normalizeSave({
      version: 3,
      currency: 55,
      player: { capacity: 6, inventory: { fish: 2, kelp: 3 } },
      upgrade: { purchases: 1 },
      construction: { invested: 6, required: 12, unlocked: false },
    }, 2_000);
    const before = structuredClone(saved);
    motion.advanceCharacterMotion(motion.createCharacterMotionState(), 1_000, { x: 1, y: 0 }, false);
    expect(saved).toEqual(before);
    expect(saved.version).toBe(5);
    expect(saved).not.toHaveProperty('animation');
  });
});
