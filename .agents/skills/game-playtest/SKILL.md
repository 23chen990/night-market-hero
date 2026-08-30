---
name: game-playtest
description: Run deterministic Playwright smoke gameplay against a built web-lite game and emit QA evidence. Use for the factory QA stage.
---

# Game Playtest

## Trigger

Use after a successful Web build or after a repair rebuild. Do not perform subjective design expansion, mutate game
source, or pass a run based only on screenshots.

## Inputs and outputs

- Inputs: `workspace/game/dist/`, build report, the Runtime Adapter preview endpoint.
- Outputs: `artifacts/qa-report.json`, `logs/console.log`, `screenshots/gameplay.png`.

## Procedure

1. Start preview on localhost and launch headless Chromium at a fixed viewport.
2. Wait for `__GAME_TEST__`; reset and seed it. Exercise spawn, produce/deliver/reward, grant/upgrade, and inspect state.
3. Confirm a visible Canvas and capture a full-page screenshot. Capture console errors and page exceptions.
4. Always close browser and preview in cleanup. Validate report JSON before handoff.

## Acceptance

All deterministic assertions pass, Canvas is visible, no error issue remains, evidence files exist, and
`QaReportSchema.passed` is true only when checks truly passed.

## Failure

Translate timeouts, browser launch failures, assertion failures, and console errors into explicit QA issues. A failed
QA report is valid output for Fixer; infrastructure failure also stops silent release.
