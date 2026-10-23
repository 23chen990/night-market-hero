export type RewardedPlacement = 'revive' | 'double-wishfire' | 'iaa-talisman' | 'iaa-firecracker';
export type InterstitialPlacement = 'natural-transition';
export type RewardedAdResult = { status: 'completed' | 'dismissed' | 'unavailable' | 'failed' };
export type InterstitialAdResult = { status: 'shown' | 'unavailable' | 'failed' };

export interface AdProvider {
  /** A configured bridge must actually exist before the UI offers an ad. */
  readonly available?: boolean;
  showRewarded(placement: RewardedPlacement): Promise<RewardedAdResult>;
  showInterstitial(placement: InterstitialPlacement): Promise<InterstitialAdResult>;
}

export interface InjectedAdBridge {
  showRewarded(placement: RewardedPlacement): Promise<RewardedAdResult>;
  showInterstitial(placement: InterstitialPlacement): Promise<InterstitialAdResult>;
}

export class NoopAdProvider implements AdProvider {
  readonly available = false;
  async showRewarded(placement: RewardedPlacement): Promise<RewardedAdResult> {
    void placement;
    return { status: 'unavailable' };
  }

  async showInterstitial(placement: InterstitialPlacement): Promise<InterstitialAdResult> {
    void placement;
    return { status: 'unavailable' };
  }
}

export class InjectedAdProvider implements AdProvider {
  readonly available = true;
  constructor(private readonly bridge: InjectedAdBridge, private readonly timeoutMs = 120_000) {}

  private settle<T extends RewardedAdResult | InterstitialAdResult>(request: () => Promise<T>): Promise<T | { status: 'failed' }> {
    // A missing SDK callback must not permanently lock the settlement screen.
    // Once timed out, a late completion is ignored and grants no reward.
    return new Promise(resolve => {
      let finished = false;
      const finish = (result: T | { status: 'failed' }): void => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        resolve(result);
      };
      const timeout = Number.isFinite(this.timeoutMs) ? Math.max(1, this.timeoutMs) : 120_000;
      const timer = setTimeout(() => finish({ status: 'failed' }), timeout);
      Promise.resolve().then(request).then(finish, () => finish({ status: 'failed' }));
    });
  }

  async showRewarded(placement: RewardedPlacement): Promise<RewardedAdResult> {
    try {
      return await this.settle(() => this.bridge.showRewarded(placement));
    } catch {
      return { status: 'failed' };
    }
  }

  async showInterstitial(placement: InterstitialPlacement): Promise<InterstitialAdResult> {
    try {
      return await this.settle(() => this.bridge.showInterstitial(placement));
    } catch {
      return { status: 'failed' };
    }
  }
}

export interface TapTapProviderConfig {
  tap?: unknown;
  createBridge(tap: unknown): InjectedAdBridge | null;
}

export function createTapTapAdProvider(config: TapTapProviderConfig): AdProvider {
  const detectedTap = config.tap ?? (globalThis as typeof globalThis & { tap?: unknown }).tap;
  if (!detectedTap) return new NoopAdProvider();
  try {
    const bridge = config.createBridge(detectedTap);
    return bridge ? new InjectedAdProvider(bridge) : new NoopAdProvider();
  } catch {
    return new NoopAdProvider();
  }
}

export class MockAdProvider implements AdProvider {
  readonly available = false;
  readonly rewardedPlacements: RewardedPlacement[] = [];
  readonly interstitialPlacements: InterstitialPlacement[] = [];
  private readonly rewardedQueue: RewardedAdResult[] = [];
  private readonly interstitialQueue: InterstitialAdResult[] = [];

  queueRewarded(...results: RewardedAdResult[]): void {
    this.rewardedQueue.push(...results);
  }

  queueInterstitial(...results: InterstitialAdResult[]): void {
    this.interstitialQueue.push(...results);
  }

  async showRewarded(placement: RewardedPlacement): Promise<RewardedAdResult> {
    this.rewardedPlacements.push(placement);
    return this.rewardedQueue.shift() ?? { status: 'unavailable' };
  }

  async showInterstitial(placement: InterstitialPlacement): Promise<InterstitialAdResult> {
    this.interstitialPlacements.push(placement);
    return this.interstitialQueue.shift() ?? { status: 'unavailable' };
  }
}
