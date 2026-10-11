export type MotionToken = 'press' | 'microFeedback' | 'panelTransition' | 'ambientLoop';

const DURATIONS: Record<MotionToken, [number, number]> = {
  press: [80, 120],
  microFeedback: [120, 180],
  panelTransition: [180, 260],
  ambientLoop: [600, 1600],
};

export function resolveMotionDuration(token: MotionToken, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  return DURATIONS[token][1];
}

export function easeOut(value: number): number {
  const t = Math.max(0, Math.min(1, value));
  return 1 - (1 - t) ** 3;
}

export class MotionPlayer {
  value = 0;
  private startedAt = 0;
  private running = false;
  constructor(private readonly durationMs: number, private readonly easing: 'ease-out' | 'ease-in' = 'ease-out') {}
  start(nowMs: number): void { this.startedAt = nowMs; this.running = true; this.value = 0; }
  update(nowMs: number): number {
    if (!this.running) return this.value;
    const progress = this.durationMs <= 0 ? 1 : (nowMs - this.startedAt) / this.durationMs;
    const eased = this.easing === 'ease-in' ? Math.max(0, Math.min(1, progress)) ** 2 : easeOut(progress);
    this.value = eased;
    if (progress >= 1) { this.value = 1; this.running = false; }
    return this.value;
  }
}

export type PreloadGate = { ready: boolean; readyPromise: Promise<void> };

export function preloadBeforePlayback(assetKeys: string[]): PreloadGate {
  let resolveReady!: () => void;
  const gate: PreloadGate = { ready: false, readyPromise: new Promise<void>((resolve) => { resolveReady = resolve; }) };
  Promise.resolve().then(() => {
    void assetKeys;
    gate.ready = true;
    resolveReady();
  });
  return gate;
}
