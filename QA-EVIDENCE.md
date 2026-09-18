# 夜市飞侠：护印突围 Builder Evidence

## Direct double-click acceptance gate (mandatory)

每次构建验收必须同时满足以下条件，不能只验证 Vite 服务地址：

1. `npm run build` 必须生成两个自包含入口：`dist/index.html` 与 `夜市飞侠-护印突围-试玩版.html`。
2. `dist/index.html` 与试玩版均不得包含外部 `<script src>`、`<link href>` 或 module-only 入口。
3. `npx tsx tests/file-launch-smoke.ts` 必须以 `file://` 路径启动试玩版，并验证 `__PROTOTYPE_TEST__`、Phaser canvas、`data-ui-preload=ready`、最终 CSS 和零浏览器错误。
4. 用户直接双击源码 `index.html` 时，入口必须自动跳转到同目录的 `夜市飞侠-护印突围-试玩版.html`；该跳转由 `tests/level1-ui-integration.test.ts` 固定断言。
5. 验收报告必须记录上述命令的退出码与自包含产物 SHA-256；任一项缺失即不得宣称“直接双击可启动”。

Date: 2026-08-30 (Asia/Shanghai)

## TDD RED

1. `npm test` → exit 1
   - 21 tests: 13 pass, 8 fail.
   - Expected failures: missing `ads.ts`, missing `monetization.ts`, and missing rewarded-revive methods.
2. `npm test` → exit 1
   - 23 tests: 20 pass, 3 fail.
   - Historical expected failures: missing monetization flow and old built UI missing `__GAME_TEST__`.
3. `npx tsx tests/browser-smoke.ts` against the pre-change build → exit 1
   - Historical expected mismatch: the page title did not yet match the validated game title.

## TDD GREEN / Final verification

- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm run build` → exit 0; self-contained `dist/index.html` is 1,220,261 bytes.
- `npm test` → exit 0; 23 tests passed, 0 failed.
- `npx tsx tests/browser-smoke.ts` → exit 0.
  - Desktop 1180×720: pointer hold/release and Space input passed.
  - Mobile 390×844: touch hold/release, legacy one-tap terminal restart, rewarded revive, and doubled wishfire passed.
  - Browser console/page errors: 0.
- `dist/index.html` SHA-256: `fcc97fae8630a1033960e657abe2493d88c366eb73533457390a7d36130baeb0`.

## Advertising boundary

No real advertising request, ad unit ID, API key, or production SDK is included. The playable build defaults to a non-networked mock provider whose unqueued result is `unavailable`. A TapTap host can inject `window.__NIGHT_MARKET_HERO_TAPTAP_AD_CONFIG__`; global `tap` detection and bridge failures safely degrade without blocking play or granting rewards.

## Night-market escape / soft-chase iteration

### TDD RED

1. `npm test` → exit 1
   - 28 tests: 21 pass, 7 fail.
   - Expected failures: missing chase snapshot, missing `failureReason`, no caught terminal state, and the old built page missing the new escape-story copy.
2. `npx tsx tests/browser-smoke.ts` against the pre-change build → exit 1.
   - Expected failure: timeout waiting for `[data-ui="game-subtitle"]`.
3. `npx tsx --test tests/game-core.test.ts` for explicit pause → exit 1.
   - 19 tests: 18 pass, 1 fail; expected missing deterministic `setPaused` hook.
4. `npx tsx --test tests/game-core.test.ts` for forward-anchor relief → exit 1.
   - 20 tests: 19 pass, 1 fail; the chase pressure did not yet decrease after catching a meaningfully forward anchor.

### TDD GREEN

1. Initial chase core: `npx tsx --test tests/game-core.test.ts` → exit 0; 18/18 passed.
2. Pause behavior: `npx tsx --test tests/game-core.test.ts` → exit 0; 19/19 passed.
3. Forward-anchor relief: `npx tsx --test tests/game-core.test.ts` → exit 0; 20/20 passed.
4. Full final suite: `npm test` → exit 0; 30/30 passed.

### Final verification

- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm run build` → exit 0; self-contained `dist/index.html` is 1,229,616 bytes.
- `npm test` → exit 0; 30 tests passed, 0 failed.
- `npx tsx tests/browser-smoke.ts` → exit 0.
  - Desktop 1180×720: hold/release, Space input, stall/surge chase, caught failure, climax state, and reduced-motion fallback passed.
  - Mobile 390×844: touch hold/release, legacy one-tap restart, rewarded chase revive at pressure `0.42`, and doubled wishfire passed.
  - Browser console/page errors: 0.
- Self-contained external asset references: 0.
- `dist/index.html` SHA-256: `860f8847f33229cae6386db3a6f5c7a4fbaec0c19bc64c3367715dab9546fc83`.

## Formal covered-market / restored-bamboo iteration

Date: 2026-08-31 (Asia/Shanghai)

### TDD RED

- `npx tsx --test tests/formal-contract.test.ts tests/formal-world.test.ts tests/visual-standard.test.ts` → exit 1; 23 tests: 17 passed, 6 failed.
- Expected failures verified the missing `竹架` manifest/fixtures/rendering, the stall shutter freezing at `0.2222222222222222` animation progress after impact, and gate beat 3 resolving before its 24-tick action window.

### TDD GREEN / final verification

- Approved character reference SHA-256 verification → `adb2a97b3f72d9233aa807a3f7833d4f2633c6e3210b570750ded32c04f2c3eb`.
- Focused formal/core/visual suite → exit 0; 44 tests passed, 0 failed.
- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm run build` → exit 0; self-contained `dist/index.html` is 1,261,956 bytes.
- `npm test` → exit 0; 54 tests passed, 0 failed.
- Self-contained external asset references: 0.
- `dist/index.html` SHA-256: `430ee7182d3651ddf3242ed943251d543b26957cbbfa06e050c568eccf2ec3b7`.

### Browser-runner limitation

- `npx tsx tests/browser-smoke.ts` could not launch Chromium in this managed execution environment: macOS denied the browser's Mach-port registration (`bootstrap_check_in ... Permission denied`).
- The full Chrome-for-Testing binary and Playwright WebKit were also attempted and were terminated by the same managed process restriction before a page opened. No browser assertion was reached, so this iteration does not record a browser-smoke pass.

## QA repair: route anchor lock / ordinary-rhythm bamboo break

Date: 2026-08-31 (Asia/Shanghai), FIX attempt 1

### TDD RED

- `npx tsx --test tests/formal-world.test.ts tests/game-core.test.ts` → exit 1; 29 tests: 27 passed, 2 failed.
- The two expected failures reproduced only the validated issues: low-route ownership still expected `node-6` while the graph assigned it to high, and the seed-31 ordinary hold/release run observed `ready → strained → ready` instead of reaching `broken`.

### TDD GREEN / final verification

- Focused formal/core/contract suite → exit 0; 38 tests passed, 0 failed.
- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm run build` → exit 0; self-contained `dist/index.html` is 1,262,158 bytes.
- `npm test` → exit 0; 56 tests passed, 0 failed.
- `dist/index.html` SHA-256: `d6a8797ea5e4399b9a6f10b58496edc69bcd52d92f9467466be550bb3734bc01`.

### Browser-runner limitation

- `npx tsx tests/browser-smoke.ts` reached the installed Chromium launch but macOS again denied its Mach-port registration (`bootstrap_check_in ... Permission denied (1100)`) before any page opened. No browser assertion was reached, so this repair does not record a browser-smoke pass.

## Formal Builder completion: exact fixture / classic bootstrap / live-aperture route

Date: 2026-08-31 (Asia/Shanghai)

### TDD RED

- `npx tsx --test tests/formal-contract.test.ts tests/formal-world.test.ts tests/build.test.ts` → exit 1; 21 tests: 17 passed, 4 failed.
  - Expected failures: the fifth selected-treatment anchor used `y=330` instead of the validated `y=370`, route ownership still matched the altered fixture, the self-contained output used `type="module"`, and `src/main.ts` contained top-level `await`.
- `npx tsx --test tests/formal-world.test.ts` → exit 1; the low counter-passage had drawing but no collision support to carry a released low-route flight to rejoin.
- `npx tsx --test tests/build.test.ts` → exit 1; the classic inline script was emitted in `<head>` before application markup existed.
- First real-browser rerun reached the page and reported `Missing UI element: [data-ui="result"]`, proving the classic-script ordering defect before the fix.

### TDD GREEN / final verification

- Exact selected fixture restored: `y=[365,335,375,330,370,340,365,335]` with branch anchors inside separated corridors and both branches reachable through hold/release only.
- Low-route counter-passage drawing and collision now share the authored corridor geometry; the normal seed-31 rhythm reaches the common rejoin anchor and breaks bamboo through persistent `ready → strained → broken` states.
- Closing-gate drawing, solid-leaf collision, live aperture, and victory all use the same animated geometry. Beat 3 remains actionable for at least 24 fixed ticks.
- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm test` → exit 0; 66 tests passed, 0 failed.
- `npm run build` → exit 0; classic self-contained `dist/index.html` is 1,267,680 bytes with no external script or stylesheet reference and no top-level `await` in the game entry.
- `npx tsx tests/browser-smoke.ts` → exit 0 against the final `dist`.
  - Desktop 1180×720: API-after-preload, formal fixtures, pointer hold/release, Space input, chase pressure/rewards, caught/climax states, and reduced-motion fallback passed.
  - Mobile landscape 844×390: touch hold/release, terminal restart, rewarded revive, doubled wishfire, and `touch-action: none` passed.
  - `window.__PROTOTYPE_TEST__` and contract-version-1 `window.__FORMAL_TEST__` initialized with `data-ui-preload="ready"`.
  - Browser console/page errors: 0.
- `dist/index.html` SHA-256: `2ca6b84949704628568bc26e452660689735182e7b6fa59a4e7f690bd133ab74`.

This remains web-lite development/QA evidence only and is not WeChat, Douyin, or TapTap publishability evidence.

## FixerAgent — UI/gameplay mismatch retest (2026-09-03)

Route `formal-fixer`, attempt 3. Reproduction matrix: `qa-evidence/reproduction-matrix-ui-gameplay-mismatch-20260903.json`. The approved reference backdrop now dominates the default fixed side-view composition; metric/progress/tutorial layers are hidden on the default path, while item ring, talisman, and ad-play layers remain independent visible slots. World tutorial affordances and pickup rendering are active in reference mode. Chase readouts remain screen-reader-only, leaving the world guard plus one left-edge signal as the player-facing pursuit expression. All player-visible economy copy uses `金币`.

TDD RED: `npx tsx --test tests/ui-gameplay-mismatch-fix.test.ts` failed 3 focused assertions. GREEN: same suite passed 4 assertions. Full checks: lint 0, typecheck 0, `npm test` 165 passed / 0 failed / 10 skipped, build 0. Production build SHA-256: `85c49cdd327cd8a0de07e866cd38037562f4c8761228b510975274d74c47255c` (8,410,262 bytes).

Fresh Playwright natural-input run initialized `__PROTOTYPE_TEST__` and `__FORMAL_TEST__` with zero console/page errors at 1280×720, 844×390, and 390×844; portrait rotation prompt was observed. Screenshot hashes are in `artifacts/ui-gameplay-mismatch-fix-evidence-20260903.json`.

Remaining blocker: natural pointer play still falls in tutorial before reaching roof-net, so net observability is preserved as `BLOCKED`; this FIX does not claim completion. Web-lite evidence is not platform publishability evidence.

### Human-authorized follow-up FIX

The tutorial recovery guard was narrowed to genuine post-input tutorial/early-pursuit play, preserving terminal failure/restart and revive semantics. The natural pointer runner now samples during held input (20 ms cadence) and reached `safe-tutorial → first-pursuit → route-alternation → gate-climax`; observed roof-net phases were `raise → aim → release → travel → land`, with visible guard and zero console/page errors at 1280×720 and 844×390. Current production hash and screenshot hashes are recorded in `artifacts/ui-gameplay-mismatch-fix-evidence-20260903.json`. Status: `READY_FOR_INDEPENDENT_QA`; remaining limitation is that the natural trace ends in a caught gate-climax state rather than a replay settlement.

## FixerAgent — user-feedback QA repair (2026-09-03)

Route: `formal-fixer` (user-authorized final automatic repair round), attempt 3. Target: `夜市飞侠：护印突围` in this workspace only. Source QA artifact: `artifacts/user-feedback-qa-20260903.json`, SHA-256 `cde4bb0d71475d8dba107611f5463c300d6136bd5c48c9b70a35ff9cfcb32e7e`.

### TDD evidence

- RED: `npx tsx --test tests/user-feedback-fix.test.ts` → exit 1; 3 focused assertions failed for legacy `愿火` copy, missing staged tutorial affordance, and missing net telegraph/aim phases.
- GREEN: the same focused test → exit 0; 3 passed.

### Implemented fixes

- Player-visible settlement/ad copy now consistently says `金币`; internal migration fields remain compatibility-only.
- First-run tutorial rail now exposes four readable staged states (grapple, release, coin pickup, canopy rescue) with in-world icons and a transient animated stage label.
- Beam-hung cargo net now telegraphs `raise → aim → release → travel → land → active`, computes a predicted target from player motion, and renders an aimed target line/ring before unfurling; collision still resolves from the animated occupied bounds.

### Verification

- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm test` → exit 0; 157 tests passed, 0 failed, 10 skipped.
- `npm run build` → exit 0; self-contained classic build 2,467,905 bytes.
- Fresh natural Playwright (`tests/user-feedback-natural-browser.ts`) against preview `127.0.0.1:4178` used only real pointer hold/release input, no fixtures or state setters; desktop 1280×720 and landscape 844×390 completed with 0 console/page errors, and portrait 390×844 showed the rotate overlay. Screenshots are under `qa-evidence/user-feedback-20260903/`.
- Browser output hashes: `dist/index.html` and `夜市飞侠-护印突围-试玩版.html` both SHA-256 `74ca0e24a2c01068b44522cabc09de6057a333353295304959dd4be0464da9d5`.
- Screenshot SHA-256: `desktop-startup.png` `f04b102e587bef13587f59549148c06bcc4788a6940a8b9390039156e04efee2`; `desktop-natural.png` `07ea9880c920c34d517250dcdd844d7c185292091b68cbe28953f02359f48700`; `landscape-844x390-startup.png` and `landscape-844x390-natural.png` `447e3a0f7c235e1f8d81835d53f86b330b581497f57744f75d3ba770e6831ea3`; `portrait-390x844.png` `92c88bf90deca33d840310af7d7364e3f00f4c03d01655dfb16014237c92c41d`.

Remaining evidence gaps: this repair round intentionally does not address other QA blockers or prove WeChat, Douyin, or TapTap packaging. The legacy `tests/browser-smoke.ts` fixture run still expects an unrelated caught-state timing after a prior progression sequence; the focused natural browser run above is the current evidence for these three repaired issues. Status: `READY_FOR_INDEPENDENT_QA`.

## Formal QA repair round 2: pursuit truth / authored paths / bounded shell / refresh recovery

Date: 2026-08-31 (Asia/Shanghai), FIX attempt 2 of 2

### Focused TDD RED evidence

- `npx tsx --test tests/qa-round2-core.test.ts` → exit 1; 8 tests: 1 passed, 7 failed.
  - The failures reproduced guard Y following the player, missing integrated pursuer velocity/acceleration caps, inconsistent caught distance, penalty teleports, progress-only terrain reactions, narrow fixed-width gate strips, and grapple acceptance while paused.
- The natural-route/pacing extension failed before implementation: the high path never committed from hold/release input, first pursuit never reached alert, and chase-test awning/bamboo evidence was absent.
- `npx tsx --test tests/qa-round2-shell.test.ts tests/monetization.test.ts` → exit 1; 12 tests: 7 passed, 5 failed.
  - The failures reproduced missing result/pause/orientation modal markup, shared pointer/keyboard ownership, lost settlement identity, and absent versioned run snapshot restore.
- `npx tsx tests/browser-smoke.ts` against the pre-repair `dist` → exit 1 at the focused mixed-input assertion: releasing Space incorrectly released a still-held pointer grapple.

### GREEN implementation evidence

- Pursuer X now uses capped velocity/acceleration integration, pursuer Y stays on the covered-market running lane with a small independent bob, and actual player-minus-guard world separation drives pursuer distance, HUD distance, pressure, and caught contact.
- Natural hold/release-only high and low paths both commit, meet their authored roof-net or stall/counter obstacles, rejoin, and finish. Route speed, grapple-window, and pursuit-distance profiles participate in runtime behavior. 布棚、竹架、窄巷 retain safe-teach-before-chase evidence based on physical contact.
- The fixed exit arch now contains full solid side leaves from each arch edge to one continuously interpolated live aperture; drawing, collision, three beats, and aperture-only victory share those bounds.
- `#app` owns canvas, HUD, modal, warning, and input coordinates. Letterbox pillars reject input; 844×390 remains playable; 390×844 shows `请旋转至横屏`, freezes the run, and rejects gameplay input.
- Result and pause layers are modal. Result actions remain single-flight; rewarded completed/dismissed/unavailable/failed semantics are preserved. Pointer IDs and keyboard ownership release the grapple only after the final held source ends.
- Version-1 defensive run snapshots restore playing checkpoints, pause, terminal state, stable seed/run identity, revive eligibility, and idempotent settlement. Malformed or unknown-future data fails closed to a clean URL-seeded run.

### Final verification

- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm test` → exit 0; 87 tests passed, 0 failed.
- `npm run build` → exit 0; classic self-contained `dist/index.html` is 1,277,202 bytes.
- `npx tsx tests/browser-smoke.ts` → exit 0 against the built `dist` served at `127.0.0.1:4178`.
  - Desktop 1180×720: preload/API initialization, integrated chase, modal input ownership, gate collision/aperture, result single-flight, rewarded outcomes, refresh matrix, malformed/future snapshot recovery, and reduced motion passed.
  - Landscape 844×390: centered 16:9 app bounds, pillar rejection, touch hold/release, modal restart, rewarded revive, and double reward passed.
  - Portrait 390×844: full-safe-area rotate prompt, frozen simulation, and touch/Space rejection passed.
  - `window.__PROTOTYPE_TEST__` and contract-version-1 `window.__FORMAL_TEST__` initialized successfully; browser console errors: 0; page errors: 0.
- `dist/index.html` SHA-256: `db9de1ef378627c8d5c772c0d4a8fba1d1fda303d4132f75da1fd54595ee1c5c`.

### Post-fix screenshots

- `qa-evidence/qa-round2-desktop.png` — 1180×720 RGB PNG — SHA-256 `618670bea60ac779257dbd0496083cf24759b878afe4e41ab03688a7af16b133`.
- `qa-evidence/qa-round2-landscape-844x390.png` — 844×390 RGB PNG — SHA-256 `8cf8087bd630445fe89ae8a2a6729ac98e9b18b0adcb2c3d7d4f40304ab519c9`.
- `qa-evidence/qa-round2-portrait-390x844.png` — 390×844 RGB PNG — SHA-256 `3ba0b05cc6691a6664e7cd0f6cdc60a70017e4638010bc0cd476f0e76a561af4`.
- Updated gate frames remain distinct: beat 1 `71cd9a142f3ff12d172e25b2a17336c0e6cd3e24f0a713b88c81426762cef407`, beat 2 `32f003f4325da3cb048809efc88a06a54d3c4705fe82bfd07278e867d617788c`, beat 3 `ee66bca15673412c0202f304caa8b33cfab3f7b87812e1ec72c309c7895dc440`.

### Remaining limitations

- This is a self-contained web-lite release candidate and QA artifact only. It does not establish WeChat Mini Game, Douyin Mini Game, or TapTap Mini Game packaging or publishability.
- Rewarded placements remain deterministic development mocks unless a host injects the approved bridge; no production ad unit, credential, or network request is included.

## Explicit pursuer-expression repair

Date: 2026-08-31 (Asia/Shanghai), request `formal-pursuer-repair-20260831-01`

### Scope

- Addressed only `formal-single-visible-pursuer-expression`, whose QA defect is `formal-left-edge-guard-not-visually-hidden`.
- The spatial high-route, natural gate-collision, pursuit retuning, mobile copy-size, future meta-version, and stale historical screenshot-hash findings from the source QA report were not modified in this repair.

### TDD RED

- `npx tsx --test tests/qa-round2-shell.test.ts tests/formal-world.test.ts` → exit 1; 20 tests: 19 passed, 1 failed.
- Expected failure: `.guard-presence[data-visible="false"]` had no `display: none`, while the 1000-fixed-tick independent pursuer simulation already passed.

### TDD GREEN and verification

- Added the minimal non-rendering rule for the edge pursuer when `data-visible=false`; the existing runtime remains the single source for mutually exclusive edge/world visibility.
- Focused suite → exit 0; 20/20 passed.
- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm test` → exit 0; 89/89 passed.
- `npm run build` → exit 0; classic self-contained `dist/index.html` is 1,277,251 bytes.
- `npx tsx tests/browser-smoke.ts` → exit 0 against `dist` at desktop 1180×720, mobile landscape 844×390, and the retained portrait regression.
  - Desktop world-pursuer state remained mutually exclusive for 12 consecutive animation frames: `data-guard-on-screen=true`, edge `data-visible=false`, computed non-rendered bounds.
  - Mobile landscape independently verified the same mutual exclusion.
  - Browser console errors: 0; page errors: 0.
- `dist/index.html` SHA-256: `b13ede1f339d7cc6520e9930649435d9de997d8bccfa04d3c0e6508cf30b3408`.

### Pursuer visibility screenshots

- `qa-evidence/pursuer-world-inside-viewport.png` — 1180×720 RGB PNG — SHA-256 `aa2948acf3e20121992c375fcfcfdbfb857607eb05e49f2bbf7dc2818ce9185b`.
- `qa-evidence/pursuer-world-inside-viewport-844x390.png` — 844×390 RGB PNG — SHA-256 `2cb6d60e9837b4baeb348b817731940011d6f83b0a66f164d650d63edf17049d`.

Status: `READY_FOR_INDEPENDENT_QA`. This remains web-lite QA evidence only.

## Horizontal inner-market gate / saved visual evidence

Date: 2026-08-31 (Asia/Shanghai)

### TDD RED

- `npx tsx --test tests/formal-contract.test.ts tests/formal-world.test.ts tests/visual-standard.test.ts` → exit 1; 30 tests: 23 passed, 7 failed.
  - Expected failures proved that the formal manifest omitted the validated collision/success/closure semantics, gate state still exposed top/bottom leaves, collision used a vertical aperture, and rendering did not consume horizontal left/right bounds.
- Full-suite regression run → exit 1; 67 tests: 65 passed, 2 failed.
  - The original seed-31 completion rhythm exposed early warning-beat collision before the final actionable beat; the focused beat-3 leaf collision and live-aperture tests remained green after the correction.
- `npx tsx --test tests/build.test.ts` → exit 1; 3 tests: 2 passed, 1 failed.
  - Expected failure required named beat-1/2/3 screenshot output and browser assertions for horizontal leaf geometry.
- Screenshot review found the beat-3 result overlay could appear while PNG encoding elapsed. A new build test failed until the runner froze each fixture and asserted `status === 'playing'` before capture.
- `npx tsx --test tests/formal-world.test.ts` → exit 1; 12 tests: 11 passed, 1 failed.
  - The final expected failure proved that beats 1–2 still needed the same solid-leaf blocking semantics as beat 3; the subsequent green implementation preserves the normal forward route by spawning the live aperture around progress and closing inward behind it.

### TDD GREEN / final verification

- Approved strict-reference SHA-256 verified: `adb2a97b3f72d9233aa807a3f7833d4f2633c6e3210b570750ded32c04f2c3eb`.
- Horizontal gate state, drawing, collision, shrinking aperture, and victory now share `leftLeafBounds`, `rightLeafBounds`, and `collisionAperture`; vertical leaf fields are absent.
- Focused tests prove monotonic inward X motion, invariant vertical span, physical leaf deflection, valid beat-3 aperture passage, out-of-aperture rejection, and the 24-fixed-tick action window.
- UI animation tests prove identical semantic final state at 30/60/120 Hz, preload-before-playback enforcement, and an interactive reduced-motion crossfade fallback.
- `npm run lint` → exit 0.
- `npm run typecheck` → exit 0.
- `npm test` → exit 0; 69 tests passed, 0 failed.
- `npm run build` → exit 0; classic self-contained `dist/index.html` is 1,268,285 bytes.
- `npx tsx tests/browser-smoke.ts` → exit 0 against the current `dist` served at `127.0.0.1:4178`.
  - Desktop 1180×720 and mobile landscape 844×390 passed.
  - `window.__PROTOTYPE_TEST__` and contract-version-1 `window.__FORMAL_TEST__` initialized after preload.
  - Pointer, Space, touch hold/release, chase fixtures, climax, reduced-motion CSS fallback, restart, rewarded revive, and reward doubling passed.
  - Browser console/page errors: 0.
- `dist/index.html` SHA-256: `49013ef81b96bf93a2daf96e8c7a8186d43d7d33692fa606d7b3e3109587d138`.

### Three-beat browser screenshots

- `qa-evidence/closing-gate-beat-1.png` — 1180×664 RGB PNG — SHA-256 `6107ee8543c354207ef1d653bec5a04da71e92461d95b111c6f5dceaf61b2a2f`.
- `qa-evidence/closing-gate-beat-2.png` — 1180×664 RGB PNG — SHA-256 `0f06313bb8079e35c9c513d388dc1662adb94732737b22408093a10025b441d5`.
- `qa-evidence/closing-gate-beat-3.png` — 1180×664 RGB PNG — SHA-256 `1fde0cda05be554a1f629c81fcfe9e2d97392d14d4ca5e46717aedba5477e90c`.

The three files have distinct hashes and were visually inspected: both vertical leaves slide inward horizontally, keep a fixed top/bottom span, and remain unobscured in all three paused `playing` fixtures.

This remains web-lite development/QA evidence only and is not WeChat, Douyin, or TapTap publishability evidence.
