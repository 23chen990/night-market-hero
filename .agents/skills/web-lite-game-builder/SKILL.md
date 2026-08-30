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
3. In real mode start one Codex thread scoped to the workspace. Request only artifact-driven implementation work.
4. Run `buildWeb`; enumerate outputs; validate the report. Never claim success from Codex prose alone.

## Acceptance

Vite exits zero; `dist/index.html` exists; build report passes Schema and records files/thread id; gameplay source has
all seven `__GAME_TEST__` functions and a versioned local save.

## Failure

Record command output and exit code, do not emit a successful report, and preserve the workspace for inspection.
Retry recreates the workspace from template so prior partial changes cannot leak.
