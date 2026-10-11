export type Viewport = { width: number; height: number };
export type ResponsiveChrome = { top: number; bottom: number };

export type ResponsiveGameSize = {
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  panelWidth: number;
  fitsViewport: boolean;
};

const WORLD_WIDTH = 540;
const WORLD_HEIGHT = 960;
const WORLD_ASPECT = WORLD_WIDTH / WORLD_HEIGHT;

export function getResponsiveGameSize(viewport: Viewport, chrome: ResponsiveChrome): ResponsiveGameSize {
  const width = Math.max(1, Math.floor(viewport.width));
  const height = Math.max(1, Math.floor(viewport.height));
  const landscape = width > height;
  const margin = 10;

  if (landscape) {
    const panelWidth = Math.min(320, Math.max(240, Math.floor(width * 0.34)));
    const availableHeight = Math.max(240, height - margin * 2);
    const frameWidth = Math.min(
      WORLD_WIDTH,
      Math.floor(availableHeight * WORLD_ASPECT),
      Math.max(160, width - panelWidth - margin * 3),
    );
    const frameHeight = Math.max(240, Math.min(WORLD_HEIGHT, Math.round(frameWidth / WORLD_ASPECT)));
    return {
      width: frameWidth,
      height: frameHeight,
      orientation: 'landscape',
      panelWidth,
      fitsViewport: frameWidth + panelWidth + margin * 3 <= width && frameHeight + margin * 2 <= height,
    };
  }

  const availableHeight = Math.max(240, height - Math.max(0, chrome.top) - Math.max(0, chrome.bottom) - margin * 2);
  const frameWidth = Math.min(WORLD_WIDTH, width - margin * 2, Math.floor(availableHeight * WORLD_ASPECT));
  const frameHeight = Math.max(240, Math.min(WORLD_HEIGHT, Math.round(frameWidth / WORLD_ASPECT)));
  return {
    width: Math.max(160, frameWidth),
    height: frameHeight,
    orientation: 'portrait',
    panelWidth: 0,
    fitsViewport: frameWidth + margin * 2 <= width && frameHeight + Math.max(0, chrome.top) + Math.max(0, chrome.bottom) + margin * 2 <= height,
  };
}
