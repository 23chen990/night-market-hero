import {
  CURRENT_SAVE_VERSION,
  advanceGameForRefresh,
  createInitialState,
  normalizeSave,
  type GameState,
} from './simulation';

export { CURRENT_SAVE_VERSION };

export const SAVE_KEY = 'ai-game-factory:beach_fish_market_v6:save-v5';
export const PREVIOUS_SAVE_KEY = 'ai-game-factory:beach_fish_market_v5:save-v4';
export const LEGACY_SAVE_KEY = 'ai-game-factory:beach_fish_market_v4:save-v3';
const MAX_REFRESH_RECOVERY_MS = 300_000;

export class GamePersistence {
  private lastWriteMs = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly storage: Storage,
    private readonly now: () => number = Date.now,
    private readonly throttleMs = 1_000,
  ) {}

  load(): GameState {
    const current = this.storage.getItem(SAVE_KEY);
    const previous = current === null ? this.storage.getItem(PREVIOUS_SAVE_KEY) : null;
    const legacy = current === null && previous === null ? this.storage.getItem(LEGACY_SAVE_KEY) : null;
    const rawText = current ?? previous ?? legacy;
    if (rawText === null) return createInitialState(this.now());
    let raw: unknown;
    try {
      raw = JSON.parse(rawText);
    } catch {
      return createInitialState(this.now());
    }
    let state = normalizeSave(raw, this.now());
    const elapsed = Math.min(MAX_REFRESH_RECOVERY_MS, Math.max(0, this.now() - state.savedAtMs));
    if (elapsed > 0) state = advanceGameForRefresh(state, elapsed).state;
    state.savedAtMs = this.now();
    if (legacy !== null || previous !== null) this.flush(state);
    return state;
  }

  flush(state: GameState): void {
    const snapshot = structuredClone(state);
    snapshot.version = CURRENT_SAVE_VERSION;
    snapshot.savedAtMs = this.now();
    this.storage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    this.lastWriteMs = this.now();
  }

  tick(state: GameState): void {
    if (this.now() - this.lastWriteMs >= this.throttleMs) this.flush(state);
  }

  keyChange(state: GameState): void {
    this.flush(state);
  }

  reset(): GameState {
    this.storage.removeItem(SAVE_KEY);
    this.storage.removeItem(PREVIOUS_SAVE_KEY);
    this.storage.removeItem(LEGACY_SAVE_KEY);
    const state = createInitialState(this.now());
    this.flush(state);
    return state;
  }
}
