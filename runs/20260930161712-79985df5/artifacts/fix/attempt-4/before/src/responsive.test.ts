import { describe, expect, it } from 'vitest';
import { getResponsiveGameSize } from './responsive.js';

describe('responsive world frame', () => {
  it('keeps the 540x960 world fully visible at every required viewport', () => {
    const viewports = [
      { width: 360, height: 800 },
      { width: 390, height: 844 },
      { width: 430, height: 932 },
      { width: 540, height: 960 },
      { width: 844, height: 390 },
    ];

    for (const viewport of viewports) {
      const frame = getResponsiveGameSize(viewport, { top: 86, bottom: 74 });
      expect(frame.width).toBeGreaterThan(0);
      expect(frame.height).toBeGreaterThan(0);
      expect(frame.width / frame.height).toBeCloseTo(540 / 960, 3);
      expect(frame.width).toBeLessThanOrEqual(viewport.width);
      expect(frame.height).toBeLessThanOrEqual(viewport.height);
      expect(frame.fitsViewport).toBe(true);
    }
  });

  it('allocates a side panel in landscape so controls and the canvas can coexist', () => {
    const frame = getResponsiveGameSize({ width: 844, height: 390 }, { top: 86, bottom: 74 });
    expect(frame.orientation).toBe('landscape');
    expect(frame.panelWidth).toBeGreaterThanOrEqual(240);
    expect(frame.height).toBeLessThanOrEqual(390);
    expect(frame.width + frame.panelWidth).toBeLessThanOrEqual(844);
  });
});
