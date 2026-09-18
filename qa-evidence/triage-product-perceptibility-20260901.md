# Product perceptibility triage — 2026-09-01

- Target game: 夜市飞侠：护印突围
- Exact workspace: `runs/mobile-chart-adaptation-20260830/workspace/prototype-a`
- Route: formal-fixer (core loop, multi-module UI/state/persistence, and runtime-product evidence)
- Reproduction/evidence: `src/main.ts` writes distance/combo/vehicle/sky to `#app` dataset only; `index.html` keeps coins and pursuer distance in `sr-only`; Phaser scene has `drawSkySegment` and anchors but no pickup draw pass; failed terminal card lacks run metrics; `src/game-core.ts` updates endless metrics and emits combo events but does not expose visual feedback.
- Classification: player-visible product gap, not a rules-layer gap. P0 HUD/pickup/combo/failed-settlement; P1 sky entry/vehicle expression.
- Acceptance criteria:
  1. Default browser journey visibly shows distance, run coins, combo/tier multiplier, depth, and best record.
  2. At least one active pickup is rendered with a distinct coin treatment and can be collected on the natural route.
  3. Combo gain/tier/break updates are visible in the frame and represented in event/evidence hooks.
  4. Failed runs show reason-specific title plus distance, pickups, gates, peak combo, depth, run reward, and cumulative record; settlement is committed exactly once for failure and survives restart.
  5. Sky entry has a visible transition/callout and status expression; existing vehicle state is visible in the HUD.
  6. Tests are written first and observed failing, then targeted tests, typecheck, build, and Playwright/default-journey evidence pass.

