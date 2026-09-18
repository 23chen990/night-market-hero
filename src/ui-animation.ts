export const UI_ANIMATION_STANDARD = {
  schemaVersion: 1,
  strategy: 'key-poses-plus-runtime-motion',
  assetPolicy: {
    independentAiInbetweenFrames: false,
    aiKeyPoseLimit: 4,
    preferredSequenceLayout: 'single-aligned-sprite-sheet',
    lockedFrameProperties: ['canvas', 'camera', 'scale', 'pivot', 'palette', 'lighting', 'background-mode'],
    trimFramesIndependently: false,
    requireMeaningfulAlphaForTransparentAssets: true,
  },
  runtimePolicy: {
    clock: 'time-based-requestAnimationFrame',
    preload: 'textures-and-atlases-before-first-use',
    swapImageUrlsDuringPlayback: false,
    interpolateWith: ['transform', 'opacity', 'mask'],
    useSpriteFramesFor: ['silhouette-change', 'deformation'],
    perFrameDurations: true,
  },
  motionTokensMs: {
    press: [80, 120],
    microFeedback: [120, 180],
    panelTransition: [180, 260],
    ambientLoop: [600, 1600],
  },
  easing: {
    enter: 'ease-out',
    exit: 'ease-in',
    emphasis: 'back-out-subtle',
    allowLinearForUi: false,
  },
  accessibility: {
    respectPrefersReducedMotion: true,
    reducedMotionFallback: 'short-crossfade-or-immediate-state',
  },
  verification: {
    refreshRatesHz: [30, 60, 120],
    requireSameFinalStateAcrossRefreshRates: true,
    requirePreloadTest: true,
    requireReducedMotionTest: true,
    visualChecks: ['identity-stability', 'pivot-stability', 'no-background-jitter', 'no-edge-halo'],
  },
} as const;

export type UiAnimationStandard = typeof UI_ANIMATION_STANDARD;
export type UiMotionName = keyof typeof UI_MOTIONS;
export type UiMotionDirection = 'enter' | 'exit';

export interface UiAnimationSnapshot {
  phase: 'idle' | 'playing' | 'settled';
  semanticState: 'hidden' | 'visible';
  progress: number;
  opacity: number;
  translateY: number;
  scale: number;
  interactive: true;
}

interface UiMotionDefinition {
  durationMs: number;
  easing: 'ease-out' | 'back-out-subtle';
  fromTranslateY: number;
  fromScale: number;
}

export const UI_MOTIONS = {
  'hud-enter': { durationMs: 180, easing: 'ease-out', fromTranslateY: -8, fromScale: 0.99 },
  'menu-enter': { durationMs: 240, easing: 'back-out-subtle', fromTranslateY: 14, fromScale: 0.98 },
  'overlay-feedback': { durationMs: 160, easing: 'ease-out', fromTranslateY: 8, fromScale: 0.99 },
  'icon-press': { durationMs: 100, easing: 'back-out-subtle', fromTranslateY: 0, fromScale: 0.92 },
  'state-change': { durationMs: 180, easing: 'ease-out', fromTranslateY: 0, fromScale: 0.985 },
} as const satisfies Record<string, UiMotionDefinition>;

export interface UiAnimationRuntime {
  preload(loader: (asset: string) => void | Promise<void>): Promise<void>;
  play(name: UiMotionName, startedAtMs: number, direction?: UiMotionDirection): UiAnimationSnapshot;
  sample(nowMs: number): UiAnimationSnapshot;
  getState(): UiAnimationSnapshot;
}

export interface UiAnimationRuntimeOptions {
  reducedMotion: boolean;
  requiredAssets: string[];
}

const HIDDEN_STATE: UiAnimationSnapshot = {
  phase: 'idle',
  semanticState: 'hidden',
  progress: 0,
  opacity: 0,
  translateY: 0,
  scale: 1,
  interactive: true,
};

const VISIBLE_STATE: UiAnimationSnapshot = {
  phase: 'settled',
  semanticState: 'visible',
  progress: 1,
  opacity: 1,
  translateY: 0,
  scale: 1,
  interactive: true,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeOut(value: number): number {
  return 1 - (1 - value) ** 3;
}

function easeIn(value: number): number {
  return value ** 3;
}

function backOutSubtle(value: number): number {
  const overshoot = 0.72;
  const shifted = value - 1;
  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
}

class ElapsedTimeUiAnimationRuntime implements UiAnimationRuntime {
  private preloaded = false;
  private activeMotion: UiMotionName | null = null;
  private direction: UiMotionDirection = 'enter';
  private startedAtMs = 0;
  private snapshot: UiAnimationSnapshot = { ...HIDDEN_STATE };

  constructor(private readonly options: UiAnimationRuntimeOptions) {}

  async preload(loader: (asset: string) => void | Promise<void>): Promise<void> {
    for (const asset of this.options.requiredAssets) await loader(asset);
    this.preloaded = true;
  }

  play(name: UiMotionName, startedAtMs: number, direction: UiMotionDirection = 'enter'): UiAnimationSnapshot {
    if (!this.preloaded) throw new Error('UI assets must preload before playback');
    if (!(name in UI_MOTIONS)) throw new Error(`Unknown UI motion: ${name}`);
    this.activeMotion = name;
    this.direction = direction;
    this.startedAtMs = startedAtMs;
    this.snapshot = this.sample(startedAtMs);
    return this.getState();
  }

  sample(nowMs: number): UiAnimationSnapshot {
    if (this.activeMotion === null) return this.getState();
    const motion = UI_MOTIONS[this.activeMotion];
    const durationMs = this.options.reducedMotion ? 80 : motion.durationMs;
    const rawProgress = clamp01((nowMs - this.startedAtMs) / durationMs);
    if (rawProgress >= 1) {
      this.snapshot = this.direction === 'enter'
        ? { ...VISIBLE_STATE }
        : { ...HIDDEN_STATE, phase: 'settled' };
      this.activeMotion = null;
      return this.getState();
    }

    const eased = this.options.reducedMotion
      ? easeOut(rawProgress)
      : this.direction === 'exit'
        ? easeIn(rawProgress)
        : motion.easing === 'back-out-subtle'
          ? backOutSubtle(rawProgress)
          : easeOut(rawProgress);
    const visibleProgress = this.direction === 'enter' ? eased : 1 - eased;
    const transformProgress = this.options.reducedMotion ? 1 : visibleProgress;
    this.snapshot = {
      phase: 'playing',
      semanticState: 'visible',
      progress: rawProgress,
      opacity: clamp01(visibleProgress),
      translateY: this.options.reducedMotion ? 0 : motion.fromTranslateY * (1 - transformProgress),
      scale: this.options.reducedMotion ? 1 : motion.fromScale + (1 - motion.fromScale) * transformProgress,
      interactive: true,
    };
    return this.getState();
  }

  getState(): UiAnimationSnapshot {
    return { ...this.snapshot };
  }
}

export function createUiAnimationRuntime(options: UiAnimationRuntimeOptions): UiAnimationRuntime {
  return new ElapsedTimeUiAnimationRuntime({
    reducedMotion: options.reducedMotion,
    requiredAssets: [...options.requiredAssets],
  });
}
