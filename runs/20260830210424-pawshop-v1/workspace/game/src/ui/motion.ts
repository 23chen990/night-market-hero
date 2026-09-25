export const MOTION_TOKENS_MS = {
  press: 100,
  microFeedback: 160,
  panelTransition: 220,
  ambientLoop: 1_200,
} as const;

export const CHARACTER_WALK_FRAME_DURATION_MS = 1_000 / 12;
export const CHARACTER_WALK_FRAME_SEQUENCE = [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1] as const;

export type CharacterDirection = 'front' | 'back' | 'side';
export type CharacterTextureKey = 'otter-walk-front' | 'otter-walk-back' | 'otter-walk-side';
export type CharacterMotionState = {
  elapsedMs: number;
  direction: CharacterDirection;
  moving: boolean;
  textureKey: CharacterTextureKey;
  frame: number;
  flipX: boolean;
};

export function createCharacterMotionState(): CharacterMotionState {
  return {
    elapsedMs: 0,
    direction: 'front',
    moving: false,
    textureKey: 'otter-walk-front',
    frame: 0,
    flipX: false,
  };
}

function directionForMovement(movement: { x: number; y: number }): CharacterDirection {
  if (Math.abs(movement.x) > Math.abs(movement.y)) return 'side';
  return movement.y < 0 ? 'back' : 'front';
}

export function advanceCharacterMotion(
  state: CharacterMotionState,
  elapsedMs: number,
  movement: { x: number; y: number },
  reducedMotion: boolean,
): CharacterMotionState {
  if (reducedMotion || movement.x * movement.x + movement.y * movement.y <= 0.0001) {
    return createCharacterMotionState();
  }
  const direction = directionForMovement(movement);
  const nextElapsed = Math.max(0, state.moving && state.direction === direction ? state.elapsedMs + elapsedMs : elapsedMs);
  const cycleMs = CHARACTER_WALK_FRAME_DURATION_MS * CHARACTER_WALK_FRAME_SEQUENCE.length;
  const cyclePosition = ((nextElapsed % cycleMs) + cycleMs) % cycleMs;
  const sequenceIndex = Math.floor((cyclePosition + 0.000_001) / CHARACTER_WALK_FRAME_DURATION_MS)
    % CHARACTER_WALK_FRAME_SEQUENCE.length;
  return {
    elapsedMs: nextElapsed,
    direction,
    moving: true,
    textureKey: direction === 'front' ? 'otter-walk-front' : direction === 'back' ? 'otter-walk-back' : 'otter-walk-side',
    frame: CHARACTER_WALK_FRAME_SEQUENCE[sequenceIndex]!,
    flipX: direction === 'side' && movement.x < 0,
  };
}

export type MotionState = {
  from: string;
  to: string;
  semantic: string;
  durationMs: number;
  elapsedMs: number;
  progress: number;
  easedProgress: number;
  complete: boolean;
};

const easeOutCubic = (progress: number) => 1 - (1 - progress) ** 3;

export function createMotionState(from: string, to: string, durationMs: number): MotionState {
  return {
    from,
    to,
    semantic: from,
    durationMs: Math.max(0, durationMs),
    elapsedMs: 0,
    progress: 0,
    easedProgress: 0,
    complete: false,
  };
}

export function advanceMotion(state: MotionState, elapsedMs: number, reducedMotion: boolean): MotionState {
  if (state.complete) return state;
  if (reducedMotion || state.durationMs === 0) {
    return { ...state, semantic: state.to, elapsedMs: state.durationMs, progress: 1, easedProgress: 1, complete: true };
  }
  const nextElapsed = Math.min(state.durationMs, state.elapsedMs + Math.max(0, elapsedMs));
  const progress = nextElapsed / state.durationMs;
  const complete = progress >= 1;
  return {
    ...state,
    semantic: complete ? state.to : state.from,
    elapsedMs: nextElapsed,
    progress: complete ? 1 : progress,
    easedProgress: complete ? 1 : easeOutCubic(progress),
    complete,
  };
}

export function resolveMotionTokens(reducedMotion: boolean) {
  if (!reducedMotion) return MOTION_TOKENS_MS;
  return { press: 0, microFeedback: 0, panelTransition: 0, ambientLoop: 0 } as const;
}

export type KeyPoseSequence = {
  textureUrl: string;
  frameDurationsMs: readonly number[];
  totalDurationMs: number;
};

export function createKeyPoseSequence(textureUrl: string, frameDurationsMs: readonly number[]): KeyPoseSequence {
  const durations = frameDurationsMs.map((duration) => Math.max(1, duration));
  return { textureUrl, frameDurationsMs: durations, totalDurationMs: durations.reduce((sum, value) => sum + value, 0) };
}

export function sampleKeyPose(sequence: KeyPoseSequence, elapsedMs: number) {
  const target = ((Math.max(0, elapsedMs) % sequence.totalDurationMs) + sequence.totalDurationMs) % sequence.totalDurationMs;
  let cursor = 0;
  for (let index = 0; index < sequence.frameDurationsMs.length; index += 1) {
    cursor += sequence.frameDurationsMs[index]!;
    if (target < cursor) return index;
  }
  return sequence.frameDurationsMs.length - 1;
}

export class AssetPreloadGate {
  visible = false;
  private ready = false;

  constructor(
    private readonly assets: readonly string[],
    private readonly loader: (asset: string) => Promise<void>,
  ) {}

  async preload() {
    for (const asset of this.assets) await this.loader(asset);
    this.ready = true;
  }

  requestPlayback() {
    if (!this.ready) return false;
    this.visible = true;
    return true;
  }
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function animateElement(
  element: HTMLElement,
  options: { durationMs: number; fromOpacity?: number; toOpacity?: number; fromScale?: number; toScale?: number },
) {
  const reduced = prefersReducedMotion();
  const duration = reduced ? 0 : Math.max(0, options.durationMs);
  const start = performance.now();
  const fromOpacity = options.fromOpacity ?? 1;
  const toOpacity = options.toOpacity ?? 1;
  const fromScale = options.fromScale ?? 1;
  const toScale = options.toScale ?? 1;
  let frameId = 0;
  const sample = (now: number) => {
    const raw = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
    const progress = easeOutCubic(raw);
    element.style.opacity = String(fromOpacity + (toOpacity - fromOpacity) * progress);
    const scale = fromScale + (toScale - fromScale) * progress;
    element.style.transform = `scale(${scale})`;
    if (raw < 1) frameId = requestAnimationFrame(sample);
    else {
      element.style.removeProperty('transform');
      if (toOpacity === 1) element.style.removeProperty('opacity');
    }
  };
  frameId = requestAnimationFrame(sample);
  return () => cancelAnimationFrame(frameId);
}
