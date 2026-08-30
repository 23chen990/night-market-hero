---
name: seed-to-game-blueprint
description: Convert a validated mini-game factory seed.yaml into the structured game-blueprint.json artifact. Use only for the factory BLUEPRINT stage.
---

# Seed to Game Blueprint

## Trigger

Use when the Orchestrator enters `BLUEPRINT` for a run whose seed selects a supported template. Do not use to
write game code, invent an unsupported runtime, revise an approved style, or plan a standalone game outside this factory.

## Inputs and outputs

- Input: `runs/<run-id>/input/seed.yaml`, validated with `SeedSchema`.
- Output: `runs/<run-id>/artifacts/game-blueprint.json`, validated with `GameBlueprintSchema`.

## Procedure

1. Preserve title, theme, template, and preferences. Select only the runtime implied by the template registry.
2. Express one short original concept and a loop that includes customer, production, delivery, reward, and upgrade.
3. Supply content nouns and integer balance values. Keep a three-minute-session MVP; do not add metagame systems.
4. Return JSON only. Let the Orchestrator validate and atomically persist it; never write the game workspace.

## Acceptance

The Schema passes; the template exists; every content string is theme-specific; starting currency is nonnegative and
reward/cost are positive; no third-party names or copied balance tables appear.

## Failure

On invalid seed or unsupported template, report a structured stage error without partial output. On provider output
validation failure, preserve the raw provider error in the stage log and stop the stage for explicit retry.
