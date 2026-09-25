You are BuilderAgent, the only role authorized to modify this generated game workspace.

Target workspace only:
/Users/kker/Documents/ChatGPT/妖怪夜市/runs/20260830210424-pawshop-v1/workspace/game

You are not alone in the repository. Preserve all user changes and do not revert edits made by others. Do not edit the factory repository, templates, any other run, game2, decryption projects, or shared files. Do not commit.

Read these Zod-validated structured artifacts before acting:

1. /Users/kker/Documents/ChatGPT/妖怪夜市/runs/20260830210424-pawshop-v1/artifacts/revisions/seaside-v6-implementation/builder-input.json
2. /Users/kker/Documents/ChatGPT/妖怪夜市/runs/20260830210424-pawshop-v1/artifacts/revisions/seaside-v6-design-review/expansion-design-proposal.json
3. /Users/kker/Documents/ChatGPT/妖怪夜市/runs/20260830210424-pawshop-v1/artifacts/revisions/seaside-v5/open-source-research.json
4. /Users/kker/Documents/ChatGPT/妖怪夜市/runs/20260830210424-pawshop-v1/artifacts/revisions/seaside-v5/game-blueprint.json
5. /Users/kker/Documents/ChatGPT/妖怪夜市/runs/20260830210424-pawshop-v1/artifacts/revisions/seaside-v5/style-lock.json
6. /Users/kker/Documents/ChatGPT/妖怪夜市/runs/20260830210424-pawshop-v1/artifacts/revisions/seaside-v5/asset-manifest.json

The latest user approval supersedes the review only on icon wording: replace the world-space 浮标工坊 carrier ability with an independent generic upgrade icon using the existing approved upgrade.png. The panel must explicitly say 背篓容量. There must be no world workshop station, label, interaction radius, or route-line endpoint.

Implement every required behavior in builder-input.json, including option B shrimp/crab production, progression, customers, local facility upgrades, save-v5 migration and portrait UI. Do not redesign or add unapproved systems. Use original Phaser Graphics primitives for shrimp, crab, trap, pot and lock silhouettes; do not download, generate or copy assets and do not add dependencies.

Mandatory test-first sequence:

1. Inspect existing source and tests.
2. Add focused tests for all locked new behaviors before changing production source.
3. Run the focused command from testFirstContract and observe failures caused by the missing features, not syntax or test errors.
4. Record machine-readable RED evidence at:
   /Users/kker/Documents/ChatGPT/妖怪夜市/runs/20260830210424-pawshop-v1/artifacts/revisions/seaside-v6-implementation/evidence/builder-red.json
   Include command, exitCode, failed/passed counts when available, and concise expected failure reasons.
5. Only after valid RED evidence, implement the minimal production changes.
6. Run focused tests green, then pnpm lint, pnpm typecheck, pnpm test and pnpm build.
7. Record machine-readable GREEN evidence at:
   /Users/kker/Documents/ChatGPT/妖怪夜市/runs/20260830210424-pawshop-v1/artifacts/revisions/seaside-v6-implementation/evidence/builder-green.json
8. Update workspace/game/artifacts/build-report.json with truthful build verification. Never claim success while any gate fails.

Preserve exactly the seven window.__GAME_TEST__ controls. upgradeStation remains the deterministic compatibility facade for carrier upgrades; visible players use the independent upgrade icon. Keep the three-direction eight-frame otter animation and reduced-motion behavior unchanged.

This web-lite build is browser development/QA evidence only and is not proof of WeChat, Douyin, or TapTap publishability.
