import { describe, expect, it } from 'vitest';
import { getResponsiveGameSize, getWorldTransform } from './responsive.js';

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
      const expectedAspect = frame.orientation === 'landscape' ? 960 / 540 : 540 / 960;
      expect(Math.abs(frame.width / frame.height - expectedAspect)).toBeLessThan(0.003);
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

  it('keeps landscape world labels upright with an invertible touch transform', () => {
    const transform = getWorldTransform('landscape');
    const logical = { x: 120, y: 420 };
    expect(transform.displayToLogical(transform.logicalToDisplay(logical))).toEqual(logical);
    expect(transform.displayMoveToLogical({ x: 1, y: 0 })).toEqual({ x: 0, y: 1 });
    expect(transform.displayMoveToLogical({ x: 0, y: 1 })).toEqual({ x: -1, y: 0 });
  });
});
