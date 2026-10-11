import type { AdProvider } from './ads';
import type { RewardedAdResult } from './ads';
import { CHARACTERS, missionForProgress, type Mission } from './progression';

export interface RunCompletionMetrics {
  distanceMeters?: number;
  pickups?: number;
  combo?: number;
  gatesPassed?: number;
  pickupCoins?: number;
  skySegments?: number;
  tutorialCompleted?: boolean;
}

export interface RecordLedger {
  runs: number;
  bestDistanceMeters: number;
  lifetimeDistanceMeters: number;
  coinsCollected: number;
  highestCombo: number;
  skySegments: number;
}

export interface ActiveMission extends Mission {
  condition: 'gates' | 'combo' | 'skySegments';
  current: number;
  target: number;
  claimable: boolean;
}

export interface MetaProgress {
  version: 1 | 2;
  wishfire: number;
  coins: number;
  completionCount: number;
  endlessUnlocked?: boolean;
  bestDistance?: number;
  bestGates?: number;
  characters?: string[];
  records?: { totalMeters: number; totalPickups: number; bestCombo: number; gates: number; coinsCollected?: number; skySegments?: number };
  identityRank?: number;
  selectedCharacter?: string;
  completedMissions?: string[];
  itemFirstUse?: { talisman: boolean; firecracker: boolean };
  itemUnlocked?: { talisman: boolean; firecracker: boolean };
  dailyFreeReviveDay?: string;
  dailyFreeReviveRunId?: string;
  dailyFreeReviveRunIds?: string[];
}

export interface ProgressStorage {
  read(): string | null;
  write(value: string): void | boolean;
  getPersistenceIssue?(): string | null;
}

export class MemoryProgressStorage implements ProgressStorage {
  constructor(private value: string | null = null) {}

  read(): string | null {
    return this.value;
  }

  write(value: string): boolean {
    this.value = value;
    return true;
  }

}

export class LocalProgressStorage implements ProgressStorage {
  private persistenceIssue: string | null = null;

  constructor(private readonly key = 'night-market-hero.meta.v1') {}

  read(): string | null {
    try {
      if (!globalThis.localStorage) return null;
      this.persistenceIssue = null;
      return globalThis.localStorage.getItem(this.key);
    } catch {
      this.persistenceIssue = 'progress-read-failed';
      return null;
    }
  }

  write(value: string): boolean {
    try {
      if (!globalThis.localStorage) {
        this.persistenceIssue = 'progress-save-failed';
        return false;
      }
      globalThis.localStorage.setItem(this.key, value);
      this.persistenceIssue = null;
      return true;
    } catch {
      this.persistenceIssue = 'progress-save-failed';
      return false;
    }
  }

  getPersistenceIssue(): string | null {
    return this.persistenceIssue;
  }

  clear(): void {
    try { globalThis.localStorage?.removeItem(this.key); } catch { /* reset remains non-blocking */ }
  }
}

interface Settlement {
  baseReward: number;
  doubled: boolean;
  resumed?: boolean;
  metrics?: PersistedRunMetrics;
}

interface PersistedRunMetrics {
  distanceMeters: number;
  pickups: number;
  combo: number;
  gatesPassed: number;
  pickupCoins: number;
  skySegments: number;
}

const MAX_SAFE_PROGRESS_VALUE = Number.MAX_SAFE_INTEGER;
const DEFAULT_CHARACTER = '街灯客';
const KNOWN_PROGRESS_KEYS = new Set([
  'version',
  'wishfire',
  'coins',
  'completionCount',
  'endlessUnlocked',
  'bestDistance',
  'bestGates',
  'characters',
  'records',
  'identityRank',
  'selectedCharacter',
  'completedMissions',
  'itemFirstUse',
  'itemUnlocked',
  'dailyFreeReviveDay',
  'dailyFreeReviveRunId',
  'dailyFreeReviveRunIds',
  'settlements',
]);

type PersistenceIssue =
  | 'progress-read-failed'
  | 'progress-invalid-json'
  | 'progress-invalid-shape'
  | 'progress-future-version'
  | 'progress-unsupported-version'
  | 'progress-save-failed'
  | 'progress-load-rejected';

interface StoredState {
  progress: MetaProgress;
  settlements: Map<string, Settlement>;
  issue: PersistenceIssue | null;
  persistenceBlocked: boolean;
  shouldInitialize: boolean;
}

interface CompleteRunSuccess {
  baseReward: number;
  totalReward: number;
  canDouble: boolean;
  status?: undefined;
  reason?: undefined;
}

interface CompleteRunFailure {
  status: 'not-committed' | 'rejected';
  reason: 'persistence-unavailable' | 'invalid-input';
  baseReward: 0;
  totalReward: 0;
  canDouble: false;
}

export type CompleteRunResult = CompleteRunSuccess | CompleteRunFailure;

function defaultProgress(): MetaProgress {
  return {
    version: 2,
    wishfire: 0,
    coins: 0,
    completionCount: 0,
    endlessUnlocked: false,
    bestDistance: 0,
    bestGates: 0,
    characters: [DEFAULT_CHARACTER],
    records: { totalMeters: 0, totalPickups: 0, bestCombo: 0, gates: 0, coinsCollected: 0, skySegments: 0 },
    itemFirstUse: { talisman: false, firecracker: false },
    itemUnlocked: { talisman: false, firecracker: false },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSafeNonNegative(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > MAX_SAFE_PROGRESS_VALUE) return null;
  return Math.floor(value);
}

function normalizeOptionalSafeNonNegative(value: unknown): number | undefined | null {
  if (value === undefined) return undefined;
  return normalizeSafeNonNegative(value);
}

function normalizeBoolean(value: unknown): boolean | undefined | null {
  if (value === undefined) return undefined;
  return typeof value === 'boolean' ? value : null;
}

function normalizeStringArray(value: unknown): string[] | undefined | null {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return null;
  const values = value.map((entry) => typeof entry === 'string' && entry.length > 0 ? entry : null);
  if (values.some((entry) => entry === null)) return null;
  const strings = values as string[];
  if (new Set(strings).size !== strings.length) return null;
  return strings;
}

function normalizeOptionalRunId(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function normalizeDayKey(value: unknown): string | undefined | null {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  try { return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value ? value : null; }
  catch { return null; }
}

function utcDay(nowMs: number): string | null {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0 || nowMs > 253402300799999) return null;
  return new Date(nowMs).toISOString().slice(0, 10);
}

function normalizeItemFlags(value: unknown): { talisman: boolean; firecracker: boolean } | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  if (Object.keys(value).some((key) => key !== 'talisman' && key !== 'firecracker')) return null;
  const talisman = normalizeBoolean(value.talisman);
  const firecracker = normalizeBoolean(value.firecracker);
  if (talisman === null || firecracker === null) return null;
  return { talisman: talisman ?? false, firecracker: firecracker ?? false };
}

function normalizeRecords(value: unknown): MetaProgress['records'] | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const keys = ['totalMeters', 'totalPickups', 'bestCombo', 'gates', 'coinsCollected', 'skySegments'];
  if (Object.keys(value).some((key) => !keys.includes(key))) return null;
  const totalMeters = normalizeOptionalSafeNonNegative(value.totalMeters);
  const totalPickups = normalizeOptionalSafeNonNegative(value.totalPickups);
  const bestCombo = normalizeOptionalSafeNonNegative(value.bestCombo);
  const gates = normalizeOptionalSafeNonNegative(value.gates);
  const coinsCollected = normalizeOptionalSafeNonNegative(value.coinsCollected);
  const skySegments = normalizeOptionalSafeNonNegative(value.skySegments);
  if (totalMeters === null || totalPickups === null || bestCombo === null || gates === null || coinsCollected === null || skySegments === null) return null;
  return {
    totalMeters: totalMeters ?? 0,
    totalPickups: totalPickups ?? 0,
    bestCombo: bestCombo ?? 0,
    gates: gates ?? 0,
    coinsCollected: coinsCollected ?? 0,
    skySegments: skySegments ?? 0,
  };
}

function normalizePersistedRunMetrics(value: unknown): PersistedRunMetrics | undefined | null {
  if (value === undefined) return undefined;
  if (!isRecord(value)) return null;
  const keys = ['distanceMeters', 'pickups', 'combo', 'gatesPassed', 'pickupCoins', 'skySegments'];
  if (Object.keys(value).some((key) => !keys.includes(key))) return null;
  const distanceMeters = normalizeOptionalSafeNonNegative(value.distanceMeters);
  const pickups = normalizeOptionalSafeNonNegative(value.pickups);
  const combo = normalizeOptionalSafeNonNegative(value.combo);
  const gatesPassed = normalizeOptionalSafeNonNegative(value.gatesPassed);
  const pickupCoins = normalizeOptionalSafeNonNegative(value.pickupCoins);
  const skySegments = normalizeOptionalSafeNonNegative(value.skySegments);
  if (distanceMeters === null || pickups === null || combo === null || gatesPassed === null || pickupCoins === null || skySegments === null) return null;
  return {
    distanceMeters: distanceMeters ?? 0,
    pickups: pickups ?? 0,
    combo: combo ?? 0,
    gatesPassed: gatesPassed ?? 0,
    pickupCoins: pickupCoins ?? 0,
    skySegments: skySegments ?? 0,
  };
}

function normalizeSettlements(value: unknown): Map<string, Settlement> | null {
  if (value === undefined) return new Map();
  if (!Array.isArray(value)) return null;
  const settlements = new Map<string, Settlement>();
  for (const entry of value) {
    if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || entry[0].length === 0 || !isRecord(entry[1])) return null;
    const runId = entry[0];
    if (settlements.has(runId)) return null;
    if (Object.keys(entry[1]).some((key) => !['baseReward', 'doubled', 'resumed', 'metrics'].includes(key))) return null;
    const baseReward = normalizeSafeNonNegative(entry[1].baseReward);
    if (baseReward === null || typeof entry[1].doubled !== 'boolean') return null;
    if (entry[1].resumed !== undefined && typeof entry[1].resumed !== 'boolean') return null;
    const metrics = normalizePersistedRunMetrics(entry[1].metrics);
    if (metrics === null) return null;
    settlements.set(runId, { baseReward, doubled: entry[1].doubled, resumed: entry[1].resumed ?? false, metrics: metrics ?? undefined });
  }
  return settlements;
}

function cloneProgress(progress: MetaProgress): MetaProgress {
  return JSON.parse(JSON.stringify(progress)) as MetaProgress;
}

function cloneSettlements(settlements: Map<string, Settlement>): Map<string, Settlement> {
  return new Map([...settlements].map(([runId, settlement]) => [runId, { ...settlement }] as const));
}

function invalidStoredState(issue: PersistenceIssue): StoredState {
  return {
    progress: defaultProgress(),
    settlements: new Map(),
    issue,
    persistenceBlocked: true,
    shouldInitialize: false,
  };
}

function parseStoredState(raw: string | null): StoredState {
  if (raw === null) {
    return { progress: defaultProgress(), settlements: new Map(), issue: null, persistenceBlocked: false, shouldInitialize: true };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return invalidStoredState('progress-invalid-json');
  }
  if (!isRecord(parsed)) return invalidStoredState('progress-invalid-shape');

  const version = parsed.version;
  if (version !== undefined && (typeof version !== 'number' || !Number.isInteger(version) || version < 1)) {
    return invalidStoredState('progress-unsupported-version');
  }
  if (typeof version === 'number' && version > 2) return invalidStoredState('progress-future-version');
  if (Object.keys(parsed).some((key) => !KNOWN_PROGRESS_KEYS.has(key))) return invalidStoredState('progress-invalid-shape');

  const wishfire = normalizeOptionalSafeNonNegative(parsed.wishfire);
  const coins = normalizeOptionalSafeNonNegative(parsed.coins);
  if (wishfire === null || coins === null || (wishfire !== undefined && coins !== undefined && wishfire !== coins)) {
    return invalidStoredState('progress-invalid-shape');
  }
  const completionCount = normalizeOptionalSafeNonNegative(parsed.completionCount);
  const bestDistance = normalizeOptionalSafeNonNegative(parsed.bestDistance);
  const bestGates = normalizeOptionalSafeNonNegative(parsed.bestGates);
  const identityRank = normalizeOptionalSafeNonNegative(parsed.identityRank);
  if (completionCount === null || bestDistance === null || bestGates === null || identityRank === null) {
    return invalidStoredState('progress-invalid-shape');
  }
  const endlessUnlocked = normalizeBoolean(parsed.endlessUnlocked);
  if (endlessUnlocked === null) return invalidStoredState('progress-invalid-shape');
  const characters = normalizeStringArray(parsed.characters);
  const completedMissions = normalizeStringArray(parsed.completedMissions);
  if (characters === null || completedMissions === null) return invalidStoredState('progress-invalid-shape');
  const records = normalizeRecords(parsed.records);
  const itemFirstUse = normalizeItemFlags(parsed.itemFirstUse);
  const itemUnlocked = normalizeItemFlags(parsed.itemUnlocked);
  const settlements = normalizeSettlements(parsed.settlements);
  if (records === null || itemFirstUse === null || itemUnlocked === null || settlements === null) {
    return invalidStoredState('progress-invalid-shape');
  }
  const selectedCharacter = parsed.selectedCharacter;
  if (selectedCharacter !== undefined && (typeof selectedCharacter !== 'string' || selectedCharacter.length === 0)) {
    return invalidStoredState('progress-invalid-shape');
  }
  if (selectedCharacter !== undefined && characters !== undefined && !characters.includes(selectedCharacter)) {
    return invalidStoredState('progress-invalid-shape');
  }
  if (characters?.some(id => !CHARACTERS.some(c => c.id === id))
    || (selectedCharacter !== undefined && !CHARACTERS.some(c => c.id === selectedCharacter))) return invalidStoredState('progress-invalid-shape');
  const dailyFreeReviveDay = normalizeDayKey(parsed.dailyFreeReviveDay);
  const dailyFreeReviveRunId = normalizeOptionalRunId(parsed.dailyFreeReviveRunId);
  const dailyFreeReviveRunIds = normalizeStringArray(parsed.dailyFreeReviveRunIds);
  if (dailyFreeReviveDay === null || dailyFreeReviveRunId === null || dailyFreeReviveRunIds === null) return invalidStoredState('progress-invalid-shape');

  const progress = defaultProgress();
  const normalizedCoins = coins ?? wishfire ?? 0;
  progress.wishfire = normalizedCoins;
  progress.coins = normalizedCoins;
  progress.completionCount = completionCount ?? 0;
  progress.endlessUnlocked = endlessUnlocked ?? false;
  progress.bestDistance = bestDistance ?? 0;
  progress.bestGates = bestGates ?? 0;
  progress.characters = [...new Set([DEFAULT_CHARACTER, ...(characters ?? [])])];
  progress.records = records ?? { totalMeters: 0, totalPickups: 0, bestCombo: 0, gates: 0, coinsCollected: 0, skySegments: 0 };
  progress.identityRank = identityRank ?? 0;
  progress.selectedCharacter = selectedCharacter ?? DEFAULT_CHARACTER;
  progress.completedMissions = completedMissions ?? [];
  progress.itemFirstUse = itemFirstUse ?? { talisman: false, firecracker: false };
  progress.itemUnlocked = itemUnlocked ?? { talisman: false, firecracker: false };
  progress.dailyFreeReviveDay = dailyFreeReviveDay;
  progress.dailyFreeReviveRunId = dailyFreeReviveRunId;
  progress.dailyFreeReviveRunIds = [...new Set([...(dailyFreeReviveRunIds ?? []), ...(dailyFreeReviveRunId ? [dailyFreeReviveRunId] : [])])];
  return { progress, settlements, issue: null, persistenceBlocked: false, shouldInitialize: false };
}

function invalidCompleteRun(reason: CompleteRunFailure['reason']): CompleteRunFailure {
  return { status: reason === 'invalid-input' ? 'rejected' : 'not-committed', reason, baseReward: 0, totalReward: 0, canDouble: false };
}

export class NightMarketMonetization {
  private progress: MetaProgress;
  private readonly settlements: Map<string, Settlement>;
  private readonly pendingDoubleRuns = new Set<string>();
  private readonly pendingItemUnlocks = new Set<'talisman' | 'firecracker'>();
  private persistenceIssue: PersistenceIssue | null;
  private readonly persistenceBlocked: boolean;

  constructor(private readonly ads: AdProvider, private readonly storage: ProgressStorage) {
    let raw: string | null;
    try {
      raw = storage.read();
    } catch {
      raw = null;
      this.progress = defaultProgress();
      this.settlements = new Map();
      this.persistenceIssue = 'progress-read-failed';
      this.persistenceBlocked = true;
      return;
    }
    const storageIssue = storage.getPersistenceIssue?.();
    if (storageIssue === 'progress-read-failed') {
      this.progress = defaultProgress();
      this.settlements = new Map();
      this.persistenceIssue = 'progress-read-failed';
      this.persistenceBlocked = true;
      return;
    }
    const loaded = parseStoredState(raw);
    this.progress = loaded.progress;
    this.settlements = loaded.settlements;
    this.persistenceIssue = loaded.issue;
    this.persistenceBlocked = loaded.persistenceBlocked;
    if (loaded.shouldInitialize) this.saveCurrentState();
  }

  getProgress(): MetaProgress {
    const legacy = { version: 1 as const, wishfire: this.progress.coins, completionCount: this.progress.completionCount } as unknown as MetaProgress;
    Object.defineProperty(legacy, 'coins', { value: this.progress.coins, enumerable: false });
    Object.defineProperty(legacy, 'endlessUnlocked', { value: this.progress.endlessUnlocked, enumerable: false });
    Object.defineProperty(legacy, 'bestDistance', { value: this.progress.bestDistance, enumerable: false });
    return legacy;
  }

  getProgressV2(): MetaProgress {
    return JSON.parse(JSON.stringify(this.progress)) as MetaProgress;
  }

  getPersistenceIssue(): string | null {
    return this.persistenceIssue;
  }

  unlockCharacter(characterId: string): { status: 'unknown-character' | 'already-owned' | 'insufficient-coins' | 'unlocked' | 'not-committed'; characterId: string; coins: number } {
    const character = CHARACTERS.find(c => c.id === characterId);
    const result = (status: 'unknown-character' | 'already-owned' | 'insufficient-coins' | 'unlocked' | 'not-committed') => ({ status, characterId, coins: this.progress.coins });
    if (!character) return result('unknown-character');
    if (this.progress.characters?.includes(characterId)) return result('already-owned');
    if (this.progress.coins < character.price) return result('insufficient-coins');
    const candidate = cloneProgress(this.progress);
    candidate.coins -= character.price;
    candidate.wishfire = candidate.coins;
    candidate.characters = [...(candidate.characters ?? [DEFAULT_CHARACTER]), characterId];
    return result(this.persist(candidate, this.settlements) ? 'unlocked' : 'not-committed');
  }

  selectCharacter(characterId: string): { status: 'unknown-character' | 'not-owned' | 'selected' | 'not-committed'; characterId: string } {
    if (!CHARACTERS.some(c => c.id === characterId)) return { status: 'unknown-character', characterId };
    if (!this.progress.characters?.includes(characterId)) return { status: 'not-owned', characterId };
    const candidate = cloneProgress(this.progress);
    candidate.selectedCharacter = characterId;
    return { status: this.persist(candidate, this.settlements) ? 'selected' : 'not-committed', characterId };
  }

  private eligibleMissions(): ActiveMission[] {
    return missionForProgress({ endlessUnlocked: Boolean(this.progress.endlessUnlocked), skyUnlocked: (this.progress.records?.skySegments ?? 0) > 0, characters: this.progress.characters ?? [] })
      .filter(m => !this.progress.completedMissions?.includes(m.id))
      .map(mission => {
        const condition = mission.id.startsWith('gate-') ? 'gates' : mission.id.startsWith('combo-') ? 'combo' : 'skySegments';
        const target = Number(mission.id.split('-')[1]);
        const current = condition === 'gates' ? this.progress.records?.gates ?? 0
          : condition === 'combo' ? this.progress.records?.bestCombo ?? 0 : this.progress.records?.skySegments ?? 0;
        return { ...mission, condition, current, target, claimable: current >= target };
      });
  }

  getActiveMissions(): ActiveMission[] { return this.eligibleMissions().slice(0, 3); }

  claimMission(missionId: string): { status: 'claimed' | 'already-claimed' | 'unknown-mission' | 'not-eligible' | 'not-committed'; missionId: string } {
    if (this.progress.completedMissions?.includes(missionId)) return { status: 'already-claimed', missionId };
    const all = missionForProgress({ endlessUnlocked: true, skyUnlocked: true, characters: [] });
    if (!all.some(m => m.id === missionId)) return { status: 'unknown-mission', missionId };
    const mission = this.eligibleMissions().find(m => m.id === missionId);
    if (!mission?.claimable || this.progress.coins + mission.reward > MAX_SAFE_PROGRESS_VALUE) return { status: 'not-eligible', missionId };
    const candidate = cloneProgress(this.progress);
    candidate.coins += mission.reward;
    candidate.wishfire = candidate.coins;
    candidate.completedMissions = [...(candidate.completedMissions ?? []), missionId];
    return { status: this.persist(candidate, this.settlements) ? 'claimed' : 'not-committed', missionId };
  }

  getRecordLedger(): RecordLedger {
    return { runs: this.progress.completionCount, bestDistanceMeters: this.progress.bestDistance ?? 0,
      lifetimeDistanceMeters: this.progress.records?.totalMeters ?? 0, coinsCollected: this.progress.records?.coinsCollected ?? 0,
      highestCombo: this.progress.records?.bestCombo ?? 0, skySegments: this.progress.records?.skySegments ?? 0 };
  }

  canDailyFreeRevive(nowMs: number): boolean {
    const day = utcDay(nowMs);
    return day !== null && !this.persistenceBlocked && (this.progress.dailyFreeReviveDay === undefined || day > this.progress.dailyFreeReviveDay);
  }

  claimDailyFreeRevive(runId: string, nowMs: number): { status: 'granted' | 'already-claimed' | 'rejected' | 'not-committed'; runId: string } {
    if (typeof runId !== 'string' || runId.length === 0 || utcDay(nowMs) === null) return { status: 'rejected', runId };
    if (!this.canDailyFreeRevive(nowMs) || this.progress.dailyFreeReviveRunIds?.includes(runId)) return { status: 'already-claimed', runId };
    const candidate = cloneProgress(this.progress);
    candidate.dailyFreeReviveDay = utcDay(nowMs)!;
    candidate.dailyFreeReviveRunId = runId;
    candidate.dailyFreeReviveRunIds = [...(candidate.dailyFreeReviveRunIds ?? []), runId];
    const next = cloneSettlements(this.settlements);
    const settlement = next.get(runId);
    if (settlement?.doubled || this.pendingDoubleRuns.has(runId)) return { status: 'rejected', runId };
    if (settlement) next.set(runId, { ...settlement, resumed: true });
    return { status: this.persist(candidate, next) ? 'granted' : 'not-committed', runId };
  }

  resumeRun(runId: string): { status: 'resumed' | 'not-eligible' | 'not-committed'; runId: string } {
    const settlement = this.settlements.get(runId);
    if (!settlement || settlement.doubled || this.pendingDoubleRuns.has(runId)) return { status: 'not-eligible', runId };
    const next = cloneSettlements(this.settlements);
    next.set(runId, { ...settlement, resumed: true });
    return { status: this.persist(this.progress, next) ? 'resumed' : 'not-committed', runId };
  }

  consumeItem(item: 'talisman' | 'firecracker'): { status: 'free' | 'unlocked' | 'locked' } {
    const first = this.progress.itemFirstUse ?? { talisman: false, firecracker: false };
    const unlocked = this.progress.itemUnlocked ?? { talisman: false, firecracker: false };
    if (unlocked[item]) return { status: 'unlocked' };
    if (!first[item]) {
      const candidate = cloneProgress(this.progress);
      candidate.itemFirstUse = { ...first, [item]: true };
      if (this.persist(candidate, this.settlements)) {
        return { status: 'free' };
      }
      return { status: 'locked' };
    }
    return { status: 'locked' };
  }

  async unlockItemWithAd(item: 'talisman' | 'firecracker'): Promise<{ status: 'granted' | 'not-granted' | 'already-unlocked' | 'in-flight'; adStatus?: RewardedAdResult['status'] }> {
    const unlocked = this.progress.itemUnlocked ?? { talisman: false, firecracker: false };
    if (unlocked[item]) return { status: 'already-unlocked' };
    if (this.pendingItemUnlocks.has(item)) return { status: 'in-flight' };
    this.pendingItemUnlocks.add(item);
    try {
      let result: RewardedAdResult;
      try {
        result = await this.ads.showRewarded(item === 'talisman' ? 'iaa-talisman' : 'iaa-firecracker');
      } catch {
        return { status: 'not-granted' };
      }
      if (result.status !== 'completed') return { status: 'not-granted', adStatus: result.status };
      const latestUnlocked = this.progress.itemUnlocked ?? { talisman: false, firecracker: false };
      if (latestUnlocked[item]) return { status: 'already-unlocked', adStatus: result.status };
      const candidate = cloneProgress(this.progress);
      candidate.itemUnlocked = { ...latestUnlocked, [item]: true };
      if (!this.persist(candidate, this.settlements)) return { status: 'not-granted', adStatus: result.status };
      return { status: 'granted', adStatus: result.status };
    } finally {
      this.pendingItemUnlocks.delete(item);
    }
  }

  completeRun(runId: string, baseReward: number, metrics?: RunCompletionMetrics): CompleteRunResult {
    const reward = normalizeSafeNonNegative(baseReward);
    if (typeof runId !== 'string' || runId.length === 0 || reward === null || !this.validMetrics(metrics)) return invalidCompleteRun('invalid-input');
    let settlement = this.settlements.get(runId);
    if (!settlement || settlement.resumed) {
      const distanceMeters = normalizeSafeNonNegative(metrics?.distanceMeters ?? 0)!;
      const pickups = normalizeSafeNonNegative(metrics?.pickups ?? 0)!;
      const combo = normalizeSafeNonNegative(metrics?.combo ?? 0)!;
      const gatesPassed = normalizeSafeNonNegative(metrics?.gatesPassed ?? 0)!;
      const pickupCoins = normalizeSafeNonNegative(metrics?.pickupCoins ?? 0)!;
      const skySegments = normalizeSafeNonNegative(metrics?.skySegments ?? 0)!;
      const previous = settlement?.metrics;
      const delta = (current: number, key: keyof PersistedRunMetrics) => Math.max(0, current - (previous?.[key] ?? 0));
      const candidate = cloneProgress(this.progress);
      const nextWishfire = candidate.wishfire + Math.max(0, reward - (settlement?.baseReward ?? 0));
      const nextCompletionCount = candidate.completionCount + (settlement ? 0 : 1);
      const records = candidate.records ?? { totalMeters: 0, totalPickups: 0, bestCombo: 0, gates: 0 };
      const nextTotalMeters = records.totalMeters + delta(distanceMeters, 'distanceMeters');
      const nextTotalPickups = records.totalPickups + delta(pickups, 'pickups');
      const nextGates = records.gates + delta(gatesPassed, 'gatesPassed');
      const nextCoinsCollected = (records.coinsCollected ?? 0) + delta(pickupCoins, 'pickupCoins');
      const nextSkySegments = (records.skySegments ?? 0) + delta(skySegments, 'skySegments');
      if ([nextWishfire, nextCompletionCount, nextTotalMeters, nextTotalPickups, nextGates, nextCoinsCollected, nextSkySegments].some((value) => value > MAX_SAFE_PROGRESS_VALUE)) {
        return invalidCompleteRun('invalid-input');
      }
      candidate.wishfire = nextWishfire;
      candidate.coins = nextWishfire;
      candidate.completionCount = nextCompletionCount;
      candidate.bestDistance = Math.max(candidate.bestDistance ?? 0, distanceMeters);
      candidate.bestGates = Math.max(candidate.bestGates ?? 0, gatesPassed);
      candidate.identityRank = Math.max(candidate.identityRank ?? 0, candidate.completionCount);
      candidate.endlessUnlocked = candidate.endlessUnlocked || (metrics?.tutorialCompleted ?? true);
      candidate.records = {
        totalMeters: nextTotalMeters,
        totalPickups: nextTotalPickups,
        bestCombo: Math.max(records.bestCombo, combo),
        gates: nextGates,
        coinsCollected: nextCoinsCollected,
        skySegments: nextSkySegments,
      };
      const nextSettlements = cloneSettlements(this.settlements);
      const normalizedMetrics: PersistedRunMetrics = { distanceMeters, pickups, combo, gatesPassed, pickupCoins, skySegments };
      if (previous) for (const key of Object.keys(normalizedMetrics) as Array<keyof PersistedRunMetrics>) normalizedMetrics[key] = Math.max(previous[key], normalizedMetrics[key]);
      nextSettlements.set(runId, { baseReward: Math.max(reward, settlement?.baseReward ?? 0), doubled: false, resumed: false, metrics: normalizedMetrics });
      if (!this.persist(candidate, nextSettlements)) return invalidCompleteRun('persistence-unavailable');
      settlement = nextSettlements.get(runId)!;
    }
    return {
      baseReward: settlement.baseReward,
      totalReward: settlement.baseReward * (settlement.doubled ? 2 : 1),
      canDouble: !settlement.doubled,
    };
  }

  async doubleWishfire(runId: string): Promise<{
    status: 'granted' | 'not-granted' | 'already-claimed';
    adStatus?: RewardedAdResult['status'];
  }> {
    const settlement = this.settlements.get(runId);
    if (!settlement || settlement.doubled || settlement.resumed || this.pendingDoubleRuns.has(runId)) return { status: 'already-claimed' };
    this.pendingDoubleRuns.add(runId);
    try {
      let result: RewardedAdResult;
      try {
        result = await this.ads.showRewarded('double-wishfire');
      } catch {
        return { status: 'not-granted' };
      }
      if (result.status !== 'completed') return { status: 'not-granted', adStatus: result.status };
      if (settlement.doubled) return { status: 'already-claimed', adStatus: result.status };
      const candidate = cloneProgress(this.progress);
      const nextWishfire = candidate.wishfire + settlement.baseReward;
      if (nextWishfire > MAX_SAFE_PROGRESS_VALUE) return { status: 'not-granted', adStatus: result.status };
      candidate.wishfire = nextWishfire;
      candidate.coins = nextWishfire;
      const nextSettlements = cloneSettlements(this.settlements);
      nextSettlements.set(runId, { ...settlement, doubled: true });
      if (!this.persist(candidate, nextSettlements)) return { status: 'not-granted', adStatus: result.status };
      return { status: 'granted', adStatus: result.status };
    } finally {
      this.pendingDoubleRuns.delete(runId);
    }
  }

  spendCoins(amount: number): boolean {
    const cost = normalizeSafeNonNegative(amount);
    if (cost === null) return false;
    if (cost > this.progress.coins!) return false;
    const candidate = cloneProgress(this.progress);
    candidate.coins -= cost;
    candidate.wishfire = candidate.coins;
    return this.persist(candidate, this.settlements);
  }

  private validMetrics(metrics: RunCompletionMetrics | undefined): boolean {
    if (metrics === undefined) return true;
    if (typeof metrics !== 'object' || metrics === null) return false;
    if (metrics.tutorialCompleted !== undefined && typeof metrics.tutorialCompleted !== 'boolean') return false;
    return [metrics.distanceMeters, metrics.pickups, metrics.combo, metrics.gatesPassed, metrics.pickupCoins, metrics.skySegments]
      .every((value) => value === undefined || normalizeSafeNonNegative(value) !== null);
  }

  private saveCurrentState(): boolean {
    return this.persist(this.progress, this.settlements);
  }

  private persist(candidate: MetaProgress, settlements: Map<string, Settlement>): boolean {
    if (this.persistenceBlocked) {
      if (this.persistenceIssue === null) this.persistenceIssue = 'progress-load-rejected';
      return false;
    }
    const committedSettlements = cloneSettlements(settlements);
    try {
      const result = this.storage.write(JSON.stringify({ ...candidate, settlements: [...settlements] }));
      if (result === false) throw new Error('progress storage rejected write');
    } catch {
      this.persistenceIssue = 'progress-save-failed';
      return false;
    }
    this.progress = cloneProgress(candidate);
    this.settlements.clear();
    for (const [runId, settlement] of committedSettlements) this.settlements.set(runId, { ...settlement });
    this.persistenceIssue = null;
    return true;
  }
}

export interface InterstitialPolicyConfig {
  minimumSessionMs: number;
  minimumCompletions: number;
  minimumIntervalMs: number;
  sessionMaximum: number;
  rewardedCooldownMs: number;
}

const DEFAULT_INTERSTITIAL_POLICY: InterstitialPolicyConfig = {
  minimumSessionMs: 300_000,
  minimumCompletions: 6,
  minimumIntervalMs: 150_000,
  sessionMaximum: 3,
  rewardedCooldownMs: 180_000,
};

export class InterstitialPolicy {
  private completionCount = 0;
  private interstitialCount = 0;
  private lastInterstitialAt: number | null = null;
  private lastRewardedAt: number | null = null;

  constructor(
    private readonly sessionStartedAt: number,
    private readonly config: InterstitialPolicyConfig = DEFAULT_INTERSTITIAL_POLICY,
  ) {}

  recordCompletion(): void {
    this.completionCount += 1;
  }

  recordRewarded(now: number): void {
    this.lastRewardedAt = now;
  }

  recordInterstitial(now: number): void {
    this.lastInterstitialAt = now;
    this.interstitialCount += 1;
  }

  canShowAtNaturalTransition(now: number): boolean {
    if (now - this.sessionStartedAt < this.config.minimumSessionMs) return false;
    if (this.completionCount < this.config.minimumCompletions) return false;
    if (this.interstitialCount >= this.config.sessionMaximum) return false;
    if (this.lastInterstitialAt !== null && now - this.lastInterstitialAt < this.config.minimumIntervalMs) return false;
    if (this.lastRewardedAt !== null && now - this.lastRewardedAt < this.config.rewardedCooldownMs) return false;
    return true;
  }
}

export interface RewardedReviveTarget {
  canRewardedRevive(): boolean;
  reviveFromSafeState(): boolean;
}

export class NightMarketAdFlow {
  constructor(private readonly ads: AdProvider, private readonly policy: InterstitialPolicy) {}

  async tryRewardedRevive(
    target: RewardedReviveTarget,
    now: number,
  ): Promise<{ status: 'granted' | 'not-granted' | 'not-eligible' }> {
    if (!target.canRewardedRevive()) return { status: 'not-eligible' };
    const result = await this.ads.showRewarded('revive');
    if (result.status === 'completed' || result.status === 'dismissed') this.policy.recordRewarded(now);
    if (result.status !== 'completed') return { status: 'not-granted' };
    return { status: target.reviveFromSafeState() ? 'granted' : 'not-granted' };
  }

  async showNaturalTransitionInterstitial(
    now: number,
  ): Promise<{ status: 'shown' | 'not-shown' | 'skipped' }> {
    if (!this.policy.canShowAtNaturalTransition(now)) return { status: 'skipped' };
    const result = await this.ads.showInterstitial('natural-transition');
    if (result.status !== 'shown') return { status: 'not-shown' };
    this.policy.recordInterstitial(now);
    return { status: 'shown' };
  }
}
