import { LOGICAL_VIEWPORT } from './camera-layout.ts';
import { runPlanChunkAtIndex, type RunPlanChunkDescriptor } from './run-plan.ts';

// Keep the production renderer and RunPlan names at the dev entry boundary.
// The browser-only implementation imports them after this pure module has
// loaded, so Node checkpoint tests never initialize Phaser's DOM probe.
export { createComponentRenderer } from './component-renderer.ts';
export { createNightCityRenderer } from './night-city-renderer.ts';
export { runPlanChunkAtIndex } from './run-plan.ts';

/** Fixed, reproducible seed for the R1 inspection page. */
export const RENDER_INSPECTION_SEED = 20_260_919 as const;

export const INSPECTION_VIEWPORT = Object.freeze({
  width: LOGICAL_VIEWPORT.width,
  height: LOGICAL_VIEWPORT.height,
});

/** The page permits a small bounded camera nudge around each authored edge. */
export const INSPECTION_PAN_LIMIT = 240 as const;

export type InspectionMode = 'default' | 'longmap';

export interface RenderInspectionCheckpoint {
  id: 'market-to-rooftops' | 'rooftops-01-to-02' | 'rooftops-03-to-04';
  label: string;
  seed: number;
  boundaryX: number;
  cameraX: number;
  leftChunk: RunPlanChunkDescriptor;
  rightChunk: RunPlanChunkDescriptor;
}

interface CheckpointDefinition {
  id: RenderInspectionCheckpoint['id'];
  label: string;
  leftIndex: number;
  rightIndex: number;
}

const CHECKPOINT_DEFINITIONS: readonly CheckpointDefinition[] = [
  {
    id: 'market-to-rooftops',
    label: '闹市 → 屋脊过渡（转场 / 屋脊-01）',
    leftIndex: 4,
    rightIndex: 5,
  },
  {
    id: 'rooftops-01-to-02',
    label: '屋脊-01 → 屋脊-02 相邻区块边界',
    leftIndex: 5,
    rightIndex: 6,
  },
  {
    id: 'rooftops-03-to-04',
    label: '屋脊-03 → 屋脊-04 相邻区块边界',
    leftIndex: 7,
    rightIndex: 8,
  },
];

export function createRenderInspectionCheckpoints(
  seed = RENDER_INSPECTION_SEED,
): RenderInspectionCheckpoint[] {
  return CHECKPOINT_DEFINITIONS.map(({ id, label, leftIndex, rightIndex }) => {
    const leftChunk = runPlanChunkAtIndex(seed, leftIndex);
    const rightChunk = runPlanChunkAtIndex(seed, rightIndex);
    if (leftChunk.endX !== rightChunk.startX) {
      throw new Error(`RunPlan checkpoint is not contiguous: ${id}`);
    }
    return {
      id,
      label,
      seed,
      boundaryX: rightChunk.startX,
      cameraX: rightChunk.startX - INSPECTION_VIEWPORT.width / 2,
      leftChunk,
      rightChunk,
    };
  });
}

export function cameraLeftForCheckpoint(
  checkpoint: RenderInspectionCheckpoint,
  viewportWidth = INSPECTION_VIEWPORT.width,
): number {
  const safeWidth = Number.isFinite(viewportWidth) && viewportWidth > 0
    ? viewportWidth
    : INSPECTION_VIEWPORT.width;
  return checkpoint.boundaryX - safeWidth / 2;
}

export function clampInspectionPan(offset: number): number {
  if (!Number.isFinite(offset)) return 0;
  return Math.max(-INSPECTION_PAN_LIMIT, Math.min(INSPECTION_PAN_LIMIT, offset));
}

export function parseInspectionMode(value: string | null): InspectionMode {
  return value === 'longmap' ? 'longmap' : 'default';
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  void import('./dev-render-inspection-browser.ts');
}
