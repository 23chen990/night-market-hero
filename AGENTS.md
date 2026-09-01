# Repository Instructions

- This repository is an AI mini-game factory, not a single game project.
- Treat every game as an independent project area under its own `runs/<run-id>/workspace`; never mix code,
  assets, configuration, tests, QA evidence, or build outputs between games. Before changing a generated game,
  identify and state the exact target game and workspace path. Only modify shared factory code when the change
  is intentionally cross-game.
- Inspect the existing architecture before modifying it; reuse adapters, schemas, templates, and skills.
- Agents exchange only Zod-validated structured artifacts. They do not free-chat.
- Only BuilderAgent and FixerAgent may modify a generated game workspace.
- Never hardcode API keys. Read secrets only from environment variables.
- Never copy third-party game code, assets, names, UI, or balancing values. Generic mechanics are allowed,
  but expression and content must be original.
- For every image asset that requires transparency, request a genuinely transparent background and an
  alpha-capable PNG or WebP; never treat a checkerboard preview as transparency or allow a checkerboard/grid to
  be baked into RGB unless the user explicitly requested it as visible content. Before approving or delivering
  the asset, programmatically verify that it has a meaningful alpha channel (not merely RGBA with every pixel
  fully opaque), then composite it over light, dark, and saturated-color backgrounds and inspect for baked-in
  grids, matte colors, halos, and edge fringing. A failed check is a generation failure: regenerate or repair it
  with a verified mask, and do not deliver the defective asset.
- Every generated game targets WeChat Mini Game, Douyin Mini Game, and TapTap Mini Game. A browser-only
  `web-lite` build is development/QA evidence, not proof that any platform package is publishable. Keep each
  platform's adapter, configuration, tests, QA evidence, and build output isolated inside the same run workspace.
- Before writing or revising a generated game's technical design, produce the Zod-validated open-source research
  artifact. Check reusable infrastructure first and record repository URL, immutable revision/version, direct
  license evidence, target-platform fit, maintenance/security risk, attribution duties, and the reuse/reject
  decision. "No suitable candidate" is valid evidence; skipping the research is not.
- Reuse only infrastructure explicitly approved by that artifact and permitted by its verified license. Never use
  open source as a route to copy a third-party game's expression, content, UI, names, assets, or balancing values.
- Every feature and behavior change requires tests. Use test-first development.
- After changes, run lint, typecheck, and tests. Before claiming completion, provide machine-verifiable evidence.
- For generated-game feature changes, structural artifacts and unit tests are insufficient: the Builder/QA handoff must include a runtime-product gate proving the default browser journey (startup → declared core loop → terminal/settlement → replay) and listing the runtime-wired entrypoint files. Any legacy behavior still on the default path blocks completion; compatibility-only legacy code must be explicitly labeled with evidence.
- Avoid unnecessary production dependencies, microservices, complex backends, databases, queues, and Docker.
- Every run must pause and resume. Repeating a completed stage should be idempotent whenever practical.
- Preserve user changes and do not commit automatically.
