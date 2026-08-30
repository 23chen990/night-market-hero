---
name: asset-manifest-generator
description: Derive and produce the minimal asset set for a locked factory game, with paths, prompts, hashes, and generation status. Use for the ASSETS stage.
---

# Asset Manifest Generator

## Trigger

Use after Blueprint and Style Lock validation. Do not run before approval, expand scope into animation pipelines, or
reuse third-party artwork.

## Inputs and outputs

- Inputs: `artifacts/game-blueprint.json`, `artifacts/style-lock.json`.
- Outputs: `artifacts/asset-manifest.json` and `workspace/generated-assets/`.

## Procedure

1. Derive only assets the selected template consumes: customer, product, background, upgrade UI, and one promo image.
2. Build prompts from content plus Style Lock. Include originality and forbidden-item constraints.
3. Call `ImageProvider`; in Mock mode create deterministic local SVGs. Use stable ids and relative `assets/*` paths.
4. Hash actual bytes with SHA-256 and mark generated only after the file exists.

## Acceptance

`AssetManifestSchema` passes; each declared file exists and its hash matches; required template slots are covered;
no unreferenced asset batch or external copyrighted material is introduced.

## Failure

Never mark missing files generated. Record provider errors without keys or secrets, retain successfully written files
for diagnosis, and let an idempotent retry replace the manifest only after full validation.
