export type GuidanceState = 'ready' | 'airborne' | 'anchored' | 'failed' | 'won';

export type PromptCueKind = 'none' | 'start' | 'fly' | 'danger';

export interface GuidanceSpike {
  x: number;
  collidable?: boolean;
}

export interface PromptCue {
  kind: PromptCueKind;
  icon: string;
  title: string;
  detail: string;
}

const NO_CUE: PromptCue = { kind: 'none', icon: '', title: '', detail: '' };

const CUE_DURATION_MS: Record<Exclude<PromptCueKind, 'none'>, number> = {
  // The start cue stays until the first tap. This covers slow first-load/WebGL
  // initialization without making the cue reappear later in the same run.
  start: Number.POSITIVE_INFINITY,
  fly: 1_800,
  danger: 1_800,
};

/** Keeps a cue readable for its state window, then prevents it from returning in the same run. */
export class PromptCueMemory {
  private readonly seen = new Set<Exclude<PromptCueKind, 'none'>>();
  private active: { cue: PromptCue; expiresAt: number } | null = null;

  reset(): void {
    this.seen.clear();
    this.active = null;
  }

  resolve(candidate: PromptCue, nowMs: number): PromptCue | null {
    if (this.active && nowMs < this.active.expiresAt) {
      if (candidate.kind === 'none' || this.active.cue.kind === candidate.kind || this.seen.has(candidate.kind)) {
        return this.active.cue;
      }
    }
    this.active = null;
    if (candidate.kind === 'none') {
      return null;
    }
    if (this.seen.has(candidate.kind)) {
      return null;
    }
    this.seen.add(candidate.kind);
    this.active = { cue: candidate, expiresAt: nowMs + CUE_DURATION_MS[candidate.kind] };
    return candidate;
  }
}

/**
 * Returns the large, visual tutorial cue for the default journey. The cue is
 * driven by the real player phase and the next collidable spike so it cannot
 * claim that a danger is present when the level has no danger in front of the
 * player.
 */
export function promptCue(
  levelNumber: number,
  playerX: number,
  status: GuidanceState,
  spikes: readonly GuidanceSpike[] = [],
): PromptCue {
  if (levelNumber !== 1 || status === 'failed' || status === 'won') return NO_CUE;

  const nextSpike = spikes
    .filter((spike) => spike.collidable !== false && spike.x >= playerX)
    .sort((a, b) => a.x - b.x)[0];
  const distanceToSpike = nextSpike ? nextSpike.x - playerX : Number.POSITIVE_INFINITY;
  if ((status === 'airborne' || status === 'anchored') && distanceToSpike <= 360) {
    return {
      kind: 'danger',
      icon: '⚠',
      title: '前方危险：尖刺',
      detail: '抬高路线，及时翻转',
    };
  }

  if (status === 'ready' && playerX < 520) {
    return {
      kind: 'start',
      icon: '✦',
      title: '点击任意处起飞',
      detail: '起飞后持续点击，保持飞行',
    };
  }

  if (status === 'airborne' && playerX < 1200) {
    return {
      kind: 'fly',
      icon: '↗',
      title: '持续点击保持飞行',
      detail: '轻触控制翻转方向',
    };
  }

  return NO_CUE;
}

/** Original, compact prompts for the six observed Level 1 teaching beats. */
export function levelOnePrompt(levelNumber: number, playerX: number, status: GuidanceState): string | null {
  if (levelNumber !== 1 || status === 'failed' || status === 'won') return null;
  if (playerX < 520) return '轻触起跳；空中再次轻触翻转';
  if (playerX < 1200) return '连续轻触，保持前进节奏';
  if (playerX < 1900) return '观察彩色阶梯，选择上下路线';
  if (playerX < 2450) return '留意前方尖刺，及时翻转';
  return '靠近终点，选择倍率或安全落点';
}
