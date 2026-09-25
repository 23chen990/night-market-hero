import { describe, expect, it } from 'vitest';
import {
  AD_PLACEMENTS,
  canShowRewardedAd,
  createAdState,
  grantRewardedAd,
  type AdPlacement,
} from '../src/platform/ads';
import { createInitialState, normalizeSave, selectArea, unlockArea } from '../src/game/simulation';
import { createPlatformAdapter } from '../src/platform/adapters';
import { createAreaLayout, clampCameraToArea, areaCameraOrigin, AREA_LAYOUTS } from '../src/world/areas';

describe('IAA-only reward contract', () => {
  it('allows one optional rewarded ad per placement and records a cooldown', () => {
    const placement: AdPlacement = 'upgrade_boost';
    const initial = createAdState();
    expect(canShowRewardedAd(initial, placement, 10_000)).toBe(true);
    const result = grantRewardedAd(initial, placement, 10_000);
    expect(result.accepted).toBe(true);
    expect(result.state.impressionsByPlacement[placement]).toBe(1);
    expect(canShowRewardedAd(result.state, placement, 10_001)).toBe(false);
    expect(canShowRewardedAd(result.state, placement, 10_000 + AD_PLACEMENTS[placement].cooldownMs)).toBe(true);
  });

  it('keeps IAA rewards optional and never introduces a purchase currency', () => {
    const state = createInitialState(0);
    const result = grantRewardedAd(createAdState(), 'offline_double', 0, state);
    expect(result.accepted).toBe(true);
    expect(result.reward?.kind).toBe('offline_multiplier');
    expect(result.state.impressionsByPlacement.offline_double).toBe(1);
    expect('gems' in result.state).toBe(false);
  });
});

describe('area progression and platform boundary', () => {
  it('persists a six-area unlock spine without changing the default area', () => {
    const initial = createInitialState(0);
    expect(initial.areas.unlocked).toEqual([1]);
    expect(initial.system.saveVersion).toBe(5);
    const next = unlockArea(initial, 2).state;
    expect(next.areas.unlocked).toEqual([1, 2]);
    const restored = normalizeSave(next, 0);
    expect(restored.areas.unlocked).toEqual([1, 2]);
    expect(restored.system.ads).toEqual(restored.ads);
  });

  it('selects only an unlocked area and keeps the current area on rejection', () => {
    const initial = createInitialState(0);
    const rejected = selectArea(initial, 2).state;
    expect(rejected.areas).toEqual({ unlocked: [1], active: 1 });
    const unlocked = unlockArea(initial, 2).state;
    const selected = selectArea(unlocked, 1).state;
    expect(selected.areas).toEqual({ unlocked: [1, 2], active: 1 });
  });

  it('exposes isolated WeChat, Douyin and TapTap adapters with IAA-only capabilities', async () => {
    for (const platform of ['wechat', 'douyin', 'taptap'] as const) {
      const adapter = createPlatformAdapter(platform);
      expect(adapter.platform).toBe(platform);
      expect(adapter.capabilities.ads).toBe('rewarded-only');
      expect(adapter.capabilities.purchaseCurrency).toBe(false);
      expect(adapter.storageNamespace).toContain(platform);
      expect(await adapter.requestRewardedAd('upgrade_boost')).toMatchObject({ status: 'sdk-unavailable', rewarded: false });
    }
  });

  it('keeps each platform adapter isolated and clamps the camera to the active area', async () => {
    const modules = await Promise.all([
      import('../platforms/wechat-minigame/adapter'),
      import('../platforms/douyin-minigame/adapter'),
      import('../platforms/taptap-minigame/adapter'),
    ]);
    expect(modules.map(({ platformAdapter }) => platformAdapter.platform)).toEqual(['wechat', 'douyin', 'taptap']);
    const layout = createAreaLayout(3);
    expect(layout.title).toBe(AREA_LAYOUTS[3].title);
    expect(clampCameraToArea({ x: -100, y: 9_999 }, layout)).toEqual({ x: layout.bounds.x, y: layout.bounds.y + layout.bounds.height - layout.viewport.height });
  });

  it('defines a contiguous camera origin and non-empty production chain for every area', () => {
    const layouts = Object.values(AREA_LAYOUTS);
    expect(layouts).toHaveLength(6);
    layouts.forEach((entry, index) => {
      expect(entry.chain.length).toBeGreaterThanOrEqual(3);
      expect(entry.bounds.x).toBe(index * entry.viewport.width);
      expect(areaCameraOrigin(entry.id)).toEqual({ x: entry.bounds.x, y: entry.bounds.y });
    });
  });
});
