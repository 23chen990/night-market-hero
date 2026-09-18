import type { AdProvider } from './ads';
import type { RewardedAdResult } from './ads';

export interface MetaProgress {
  version: 1 | 2;
  wishfire: number;
  coins: number;
  completionCount: number;
  endlessUnlocked?: boolean;
  bestDistance?: number;
  bestGates?: number;
  characters?: string[];
  records?: { totalMeters: number; totalPickups: number; bestCombo: number; gates: number };
  identityRank?: number;
  selectedCharacter?: string;
  completedMissions?: string[];
  itemFirstUse?: { talisman: boolean; firecracker: boolean };
  itemUnlocked?: { talisman: boolean; firecracker: boolean };
}

export interface ProgressStorage {
  read(): string | null;
  write(value: string): void;
}

export class MemoryProgressStorage implements ProgressStorage {
  constructor(private value: string | null = null) {}

  read(): string | null {
    return this.value;
  }

  write(value: string): void {
    this.value = value;
  }

}

export class LocalProgressStorage implements ProgressStorage {
  constructor(private readonly key = 'night-market-hero.meta.v1') {}

  read(): string | null {
    try {
      return globalThis.localStorage?.getItem(this.key) ?? null;
    } catch {
      return null;
    }
  }

  write(value: string): void {
    try {
      globalThis.localStorage?.setItem(this.key, value);
    } catch {
      // Storage denial or quota must never block play.
    }
  }

  clear(): void {
    try { globalThis.localStorage?.removeItem(this.key); } catch { /* reset remains non-blocking */ }
  }
}

interface Settlement {
  baseReward: number;
  doubled: boolean;
}

function nonNegativeInteger(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function loadProgress(storage: ProgressStorage): MetaProgress {
  try {
    const parsed = JSON.parse(storage.read() ?? '{}') as Record<string, unknown>;
    if (typeof parsed.version === 'number' && parsed.version > 2) throw new Error('unsupported future progress version');
    const coins = nonNegativeInteger(parsed.coins ?? parsed.wishfire);
    return {
      version: 2,
      wishfire: coins,
      coins,
      completionCount: nonNegativeInteger(parsed.completionCount),
      endlessUnlocked: Boolean(parsed.endlessUnlocked),
      bestDistance: nonNegativeInteger(parsed.bestDistance),
      bestGates: nonNegativeInteger(parsed.bestGates),
      characters: Array.isArray(parsed.characters) ? parsed.characters.filter((v): v is string => typeof v === 'string') : ['街灯客'],
      records: { totalMeters: nonNegativeInteger((parsed.records as Record<string,unknown> | undefined)?.totalMeters), totalPickups: nonNegativeInteger((parsed.records as Record<string,unknown> | undefined)?.totalPickups), bestCombo: nonNegativeInteger((parsed.records as Record<string,unknown> | undefined)?.bestCombo), gates: nonNegativeInteger((parsed.records as Record<string,unknown> | undefined)?.gates) },
      identityRank: nonNegativeInteger(parsed.identityRank), selectedCharacter: typeof parsed.selectedCharacter === 'string' ? parsed.selectedCharacter : '街灯客', completedMissions: Array.isArray(parsed.completedMissions) ? parsed.completedMissions.filter((v): v is string => typeof v === 'string') : [],
      itemFirstUse: { talisman: Boolean((parsed.itemFirstUse as Record<string, unknown> | undefined)?.talisman), firecracker: Boolean((parsed.itemFirstUse as Record<string, unknown> | undefined)?.firecracker) },
      itemUnlocked: { talisman: Boolean((parsed.itemUnlocked as Record<string, unknown> | undefined)?.talisman), firecracker: Boolean((parsed.itemUnlocked as Record<string, unknown> | undefined)?.firecracker) },
    };
  } catch {
    return { version: 2, wishfire: 0, coins: 0, completionCount: 0, endlessUnlocked: false, bestDistance: 0, bestGates: 0, characters: ['街灯客'], records: { totalMeters: 0, totalPickups: 0, bestCombo: 0, gates: 0 }, itemFirstUse: { talisman: false, firecracker: false }, itemUnlocked: { talisman: false, firecracker: false } };
  }
}

function loadSettlements(storage: ProgressStorage): Map<string, Settlement> {
  try {
    const parsed = JSON.parse(storage.read() ?? '{}') as { settlements?: unknown };
    if (!Array.isArray(parsed.settlements)) return new Map();
    return new Map(parsed.settlements.flatMap((entry) => {
      if (!Array.isArray(entry) || typeof entry[0] !== 'string' || !entry[1] || typeof entry[1] !== 'object') return [];
      const settlement = entry[1] as Partial<Settlement>;
      if (!Number.isFinite(settlement.baseReward) || typeof settlement.doubled !== 'boolean') return [];
      return [[entry[0], { baseReward: nonNegativeInteger(settlement.baseReward), doubled: settlement.doubled }]] as const;
    }));
  } catch {
    return new Map();
  }
}

export class NightMarketMonetization {
  private progress: MetaProgress;
  private readonly settlements: Map<string, Settlement>;
  private readonly pendingDoubleRuns = new Set<string>();

  constructor(private readonly ads: AdProvider, private readonly storage: ProgressStorage) {
    this.progress = loadProgress(storage);
    this.settlements = loadSettlements(storage);
    this.save();
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

  consumeItem(item: 'talisman' | 'firecracker'): { status: 'free' | 'unlocked' | 'locked' } {
    const first = this.progress.itemFirstUse ??= { talisman: false, firecracker: false };
    const unlocked = this.progress.itemUnlocked ??= { talisman: false, firecracker: false };
    if (unlocked[item]) return { status: 'unlocked' };
    if (!first[item]) { first[item] = true; this.save(); return { status: 'free' }; }
    return { status: 'locked' };
  }

  async unlockItemWithAd(item: 'talisman' | 'firecracker'): Promise<{ status: 'granted' | 'not-granted' | 'already-unlocked'; adStatus?: RewardedAdResult['status'] }> {
    const unlocked = this.progress.itemUnlocked ??= { talisman: false, firecracker: false };
    if (unlocked[item]) return { status: 'already-unlocked' };
    const result = await this.ads.showRewarded(item === 'talisman' ? 'iaa-talisman' : 'iaa-firecracker');
    if (result.status !== 'completed') return { status: 'not-granted', adStatus: result.status };
    unlocked[item] = true;
    this.save();
    return { status: 'granted', adStatus: result.status };
  }

  completeRun(runId: string, baseReward: number, metrics?: { distanceMeters?: number; pickups?: number; combo?: number; gatesPassed?: number }): { baseReward: number; totalReward: number; canDouble: boolean } {
    const reward = Math.max(0, Math.floor(baseReward));
    let settlement = this.settlements.get(runId);
    if (!settlement) {
      settlement = { baseReward: reward, doubled: false };
      this.settlements.set(runId, settlement);
      this.progress.wishfire += reward;
      this.progress.coins = this.progress.wishfire;
      this.progress.completionCount += 1;
      this.progress.bestDistance = Math.max(this.progress.bestDistance ?? 0, nonNegativeInteger(metrics?.distanceMeters));
      this.progress.bestGates = Math.max(this.progress.bestGates ?? 0, nonNegativeInteger(metrics?.gatesPassed));
      this.progress.identityRank = Math.max(this.progress.identityRank ?? 0, this.progress.completionCount);
      this.progress.endlessUnlocked = this.progress.endlessUnlocked || this.progress.completionCount >= 1;
      const records = this.progress.records ?? { totalMeters: 0, totalPickups: 0, bestCombo: 0, gates: 0 };
      records.totalMeters += nonNegativeInteger(metrics?.distanceMeters);
      records.totalPickups += nonNegativeInteger(metrics?.pickups);
      records.bestCombo = Math.max(records.bestCombo, nonNegativeInteger(metrics?.combo));
      records.gates += nonNegativeInteger(metrics?.gatesPassed);
      this.progress.records = records;
      this.save();
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
    if (!settlement || settlement.doubled || this.pendingDoubleRuns.has(runId)) return { status: 'already-claimed' };
    this.pendingDoubleRuns.add(runId);
    try {
      const result = await this.ads.showRewarded('double-wishfire');
      if (result.status !== 'completed') return { status: 'not-granted', adStatus: result.status };
      settlement.doubled = true;
      this.progress.wishfire += settlement.baseReward;
      this.progress.coins = this.progress.wishfire;
      this.save();
      return { status: 'granted', adStatus: result.status };
    } finally {
      this.pendingDoubleRuns.delete(runId);
    }
  }

  spendCoins(amount: number): boolean {
    const cost = Math.max(0, Math.floor(amount));
    if (cost > this.progress.coins!) return false;
    this.progress.coins! -= cost;
    this.progress.wishfire = this.progress.coins;
    this.save();
    return true;
  }

  private save(): void {
    this.storage.write(JSON.stringify({ ...this.progress, settlements: [...this.settlements] }));
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
