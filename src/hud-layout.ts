/**
 * Screen-space contract for the supplied Hub composition.
 *
 * The values are authored in the 1672×941 reference stage. CSS applies one
 * uniform scale so the HUD and persistent item rail retain their measured
 * relationship on a phone landscape viewport.
 */
export const stage = { width: 1672, height: 941 } as const;

export const touchTargetMin = 44 as const;

export const referenceHud = {
  back: { x: 26, y: 26, width: 70, height: 70 },
  money: { x: 576, y: 27, width: 183, height: 58 },
  moneyValue: { x: 656, y: 45, width: 83, height: 24, preserveAspect: true },
  gate: { x: 860, y: 27, width: 176, height: 58 },
  gateCount: { x: 932, y: 35, width: 92, height: 42 },
  destination: { x: 1301, y: 35, width: 198, height: 46 },
  settings: { x: 1599, y: 32, width: 50, height: 51 },
  inventory: { x: 1519, y: 280, width: 135, height: 422 },
} as const;

export const assets = {
  settingsGear: 'src/assets/night-city/settings-gear-v1.png',
  gateCounterFrame: 'src/assets/night-city/gate-counter-frame-v1.png',
} as const;

// Descriptive aliases keep the contract easy to consume from integration and
// QA code without duplicating the measured coordinates.
export const HUD_REFERENCE_STAGE = stage;
export const HUD_LAYOUT = referenceHud;
export const TOUCH_TARGET_MIN = touchTargetMin;
