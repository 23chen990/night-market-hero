import type { GrappleState } from './game-core.ts';

export interface RunSnapshotV1 {
  version: 1;
  runId: string;
  state: GrappleState;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validState(value: unknown): value is GrappleState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<GrappleState>;
  return Number.isInteger(state.seed) && finite(state.elapsed) && Number.isInteger(state.tick)
    && ['playing', 'failed', 'won'].includes(String(state.status))
    && typeof state.paused === 'boolean'
    && finite(state.progress)
    && Boolean(state.player && finite(state.player.x) && finite(state.player.y) && finite(state.player.vx) && finite(state.player.vy))
    && Boolean(state.pursuer && finite(state.pursuer.x) && finite(state.pursuer.y)
      && finite(state.pursuer.vx) && finite(state.pursuer.ax) && finite(state.pursuer.distance))
    && Boolean(state.chase && finite(state.chase.pressure) && finite(state.chase.distance))
    && Array.isArray(state.anchors)
    && Boolean(state.gate?.leftLeafBounds && state.gate.rightLeafBounds && state.gate.collisionAperture)
    && Boolean(state.routeTraversal && state.routeGraph && state.environmentGeometry);
}

export function createRunSnapshot(runId: string, state: GrappleState): RunSnapshotV1 {
  return { version: 1, runId, state: JSON.parse(JSON.stringify(state)) as GrappleState };
}

export function parseRunSnapshot(raw: string | null): RunSnapshotV1 | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RunSnapshotV1>;
    if (parsed.version !== 1 || typeof parsed.runId !== 'string' || parsed.runId.length < 1 || !validState(parsed.state)) return null;
    return createRunSnapshot(parsed.runId, parsed.state);
  } catch {
    return null;
  }
}

export class LocalRunSnapshotStorage {
  constructor(private readonly key = 'night-market-hero.run.v2') {}

  load(): RunSnapshotV1 | null {
    try {
      return parseRunSnapshot(globalThis.localStorage?.getItem(this.key) ?? null);
    } catch {
      return null;
    }
  }

  save(snapshot: RunSnapshotV1): void {
    try {
      const existing = globalThis.localStorage?.getItem(this.key);
      if (existing) {
        try {
          const version = (JSON.parse(existing) as { version?: unknown }).version;
          if (typeof version === 'number' && version > snapshot.version) return;
        } catch {
          // Invalid current data may be replaced by the next known-good snapshot.
        }
      }
      globalThis.localStorage?.setItem(this.key, JSON.stringify(snapshot));
    } catch {
      // Storage denial or quota cannot block the game.
    }
  }

  clear(): void {
    try { globalThis.localStorage?.removeItem(this.key); } catch { /* reset remains non-blocking */ }
  }
}
