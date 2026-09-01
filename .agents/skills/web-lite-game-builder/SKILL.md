---
name: web-lite-game-builder
description: Build the generated Phaser/Vite web-lite project from validated factory artifacts and the idle-shop template. Use only for the BUILD stage.
---

# Web-lite Game Builder

## Trigger

Use for `runtime: web-lite` with a registered template. This is one of only two skills allowed to modify
`workspace/game`. Do not redesign the Blueprint, edit source templates in place, or implement Cocos.

## Inputs and outputs

- Inputs: Blueprint, Style Lock, Asset Manifest, `templates/web-lite/idle-shop-v1/`.
- Outputs: `workspace/game/`, `workspace/game/dist/`, `artifacts/build-report.json`.

## Procedure

1. Ask `RuntimeAdapter.createProject` for a clean generated workspace; apply config and import only manifest assets.
2. Ensure theme, copy, balance, and paths come from generated config. Preserve the template test API contract.
3. Treat the Zod-validated `uiAnimationStandard` in the Builder input as a versioned implementation contract.
   For HUD, menu, overlay, icon, and state transitions, prefer time-based runtime transform/opacity/mask tweens.
   Never generate separate AI images for every in-between frame. Use image frames only for genuine silhouette
   changes or deformation; when needed, use two to four aligned key poses in one sprite sheet with a stable canvas,
   camera, scale, pivot, palette, lighting, and background mode. Do not trim frames independently.
4. Preload textures/atlases before first visibility, use elapsed-time playback with per-frame durations, and never
   swap image URLs during playback. Use the supplied duration/easing tokens and implement `prefers-reduced-motion`.
5. In real mode start one Codex thread scoped to the workspace. Request only artifact-driven implementation work.
6. Run `buildWeb`; enumerate outputs; validate the report. Never claim success from Codex prose alone.
7. Verify the shipped entrypoint in a fresh browser profile (and, when supported, the exact `file://`
   self-contained HTML alias), not only through source/unit tests. Assert the first visible state is the declared
   default mode and exercise the real transition into the primary loop and its retry/replay path.
8. Treat persisted state as part of the runtime contract. With a stale snapshot containing every superseded
   mode/level, either migrate it explicitly or version/namespace the save key and reject incompatible snapshots;
   stale local state must never resurrect a removed default path.
9. Search the built artifact and runtime state for superseded default-path labels/IDs. A passing unit test is
   insufficient if the browser can still open an old bundled alias, restore a legacy snapshot, or route retry
   back into retired content.

## Acceptance

Vite exits zero; `dist/index.html` exists; build report passes Schema and records files/thread id; gameplay source has
all seven `__GAME_TEST__` functions and a versioned local save. Focused UI tests prove equivalent semantic final
states at 30/60/120 Hz, preload-before-playback, and the reduced-motion fallback whenever animated UI is present.
Runtime evidence must also include fresh startup, default-mode assertion, primary-loop entry, terminal settlement,
retry/replay, and stale-save rejection/migration. Record the exact artifact path opened during the browser check.

## Failure

Record command output and exit code, do not emit a successful report, and preserve the workspace for inspection.
Retry recreates the workspace from template so prior partial changes cannot leak.
