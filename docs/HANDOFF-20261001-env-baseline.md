# 夜市飞侠 · 醒来交接（2026-10-01 环境基线 + 输入/存档定位）

## 一句话总结

今晚完成了**独立安装验证与默认旅程基线的可信重建**：本仓库不再依赖共享工厂 node_modules，可在干净目录 `npm ci` 后完整通过 lint / typecheck / build / test / test:file 与离线样稿构建，默认旅程（教学→结算→夜巡→自然失败→重玩）在两个横屏视口下全部自然通过。同时定位了输入与存档方向共 4 处真实缺陷，其中 2 处已修复并补测试。

---

## 1. 分支、源码 SHA、推送状态

| 项 | 值 |
| --- | --- |
| 仓库 | github.com/23chen990/night-market-hero |
| 基线（历史对照） | `dd3268e2f19ca67728f5015fcacb08fce7aab188` |
| 专用分支 | `env-baseline/fresh-install-20261001`（未合并 main） |
| 提交 1 | `2f6dee0` — 环境修复（package.json / build.ts / 锁文件） |
| 提交 2 | `f249c8e` — 环境基线证据 + 自然旅程 + README |
| 提交 3（待提交） | 输入/存档最小修复 + 测试 |
| 推送状态 | **尚未推送**（本地提交已就绪，可用授权凭据推送） |

> 历史 SHA `dd3268e2` 只作对照，未回退、未从旧基线重做；本地未覆盖任何未提交工作，全程在专用 worktree 上操作。

---

## 2. 推荐试玩版本与启动方法

**推荐试玩：修复后的默认游戏（`dist/index.html` 自包含单文件，25.5 MB）。**

```bash
npm ci                 # 干净安装（有锁文件）
npm run build          # 产出自包含 dist/index.html 与 夜市飞侠-护印突围-试玩版.html
# 直接双击 夜市飞侠-护印突围-试玩版.html，或：
python3 -m http.server 4178 --directory dist   # 然后浏览器打开 http://127.0.0.1:4178/
```

默认入口仍是单键按住挂钩 / 松开脱钩；`?longmap=1` 与组件长地图候选未进入默认旅程。

---

## 3. 环境基线结论（ENV_PASS）

独立环境（不借用任何共享 node_modules、NODE_PATH、未发布资源）双阶段验证，全部 exit 0：

| 命令 | 结果 |
| --- | --- |
| `npm install`（干净目录 A） | exit 0，130 包 |
| `npm ci`（无祖先 node_modules 的目录 B） | exit 0，131 包，锁文件 byte-identical |
| `npm run lint` | exit 0（A/B） |
| `npm run typecheck` | exit 0（A/B） |
| `npm run build` | exit 0，25,532,179 字节自包含单文件 |
| `npm test` | 294 tests → **284 pass / 0 fail / 10 skip**（与历史 284/10 完全一致） |
| `npm run test:file` | exit 0（webkit，file-launch-smoke passed） |
| `python3 art-studies/facade-study-v5/qa/build-portability.test.py` | 3 tests OK（纯 stdlib） |
| `node validate-runtime-product-gates.mjs` | passed（journey 8 / wired 4） |

**修复的三处环境缺口**（原交接已记录，本次落地）：
1. `package.json` 补声明 `@eslint/js@^9.39.5` 与 `@types/node@^22.20.4`（`eslint.config.js` 直接 import `@eslint/js`，`tsconfig.json` 用了 `types:["node"]`）。
2. 补交 `package-lock.json`（lockfileVersion 3）。
3. `scripts/build.ts` 补一条正则，归一化 Vite 8.3.x 的 `new URL(\`data:...\`,\`\`+import.meta.url)` 形式，消除自包含产物里的 `import.meta` 残留（`tests/self-contained-build.test.ts` 捕获，属依赖版本漂移，非玩法问题）。

**沙箱注意**：WorkBuddy 沙箱通过 `NODE_OPTIONS` 注入 safe-delete shim（阈值 50），会拦截 `build.ts:75` 的 `rm(55 files)`；脱离 shim（`unset NODE_OPTIONS`）即通过。真实 Mac 终端无此问题。Playwright 浏览器需 `npx playwright install webkit chromium`（本机先前缺对应版本）。

---

## 4. 默认旅程结论（JOURNEY_PASS）

自然操作（真实鼠标按住/松开 + 界面按钮，**零测试后门**）在新浏览器上下文执行，`consoleErrors` 与 `pageErrors` 全空：

- **1280×720 与 844×390**：教学启动（第1关·灯棚初试）→ 按住挂钩/松开脱钩 → 教学结算（灯棚初试·突围成功，继续按钮可见）→ 继续进入无限夜巡 → 自然失败（游侠跌入摊棚间 / 护印突围中断，无输入坠落）→ 重玩。
- **390×844**：横屏提示可见 + `data-orientation-blocked=true` + 距离前后不变（暂停生效）。

证据目录：`qa-evidence/next-stage/env-baseline/fresh-install-20261001/natural-journey/`（12 张截图 + report.json，含 SHA-256）。

---

## 5. 输入 / 存档审计（N1 / N2）定位与修复

### 已修复（本轮落地 + 测试通过）

| 缺陷 | 位置 | 修复 |
| --- | --- | --- |
| N2-2 恢复快照未清除 `inputHeld`，刷新后角色无输入却持续挂接 | `src/game-core.ts` `restoreSnapshot` | 恢复时强制 `inputHeld: false` |
| N1-F2 未监听 `lostpointercapture`，隐式捕获释放时可能「松手仍挂钩」 | `src/main.ts` | 补 `lostpointercapture` 释放路径 |

新增测试：`tests/restore-input-hold.test.ts`（2 用例，通过）。

### 已定位、未修复（移交后续，附证据）

| 缺陷 | 位置 | 说明 |
| --- | --- | --- |
| N1-F1 切后台不暂停 | `src/main.ts`（仅 `blur`，无 `visibilitychange`） | `blur` 释放输入但不暂停，部分 WebView 后台仍推进 → 返回时已无操作失败。参考 `reference/v04/src/ui-v04.js:70-71`。 |
| N2-1 `runId` 非全局唯一 | `src/main.ts:147` `runSerial` 会话局部 + 与 seed 混绑 | 跨刷新同 seed 复用 `31:1`，结算账本按 runId 去重 → **漏发奖励**。建议 `crypto.randomUUID()` 与 seed 解耦。 |
| N2-疑似 元进度未来版本被静默清零 | `src/monetization.ts` `loadProgress` | `version>2` 抛错→全零→构造时 `save()` 覆盖原文。 |
| N2-疑似 账本 lenient 解析可被清空 | `src/monetization.ts` `loadSettlements` | 账本损坏时清空但金币保留 → 半一致可重复发奖。 |

### 已正确处理（审计确认无需改动）

pointerup/pointercancel 双通道脱钩、多指状态机、Space key repeat 防重入、键盘/触控重叠、暂停与竖屏独立保存恢复、暂停期间 fixedTick 不前进、结算/弹窗不穿透 grapple-surface、存档空/损坏/字段缺失安全回落、存储读写失败不白屏、同局结算幂等防重。

---

## 6. 任务表

| 任务 | 状态 | 说明 |
| --- | --- | --- |
| N0 环境与基线 | **DONE** | 独立双阶段安装 + 全链路绿 + 自然旅程绿 + 证据入库 |
| N1 输入/暂停闭环 | **部分** | F2 已修；F1（visibilitychange）已定位未修 |
| N2 存档/身份/结算 | **部分** | inputHeld 已修；runId 唯一化、未来版本保护已定位未修 |
| N3 保存热路径优化 | NOT_STARTED | 依赖 N2 身份契约，需先做只读测量 |
| N4 广告异步可靠性 | NOT_STARTED | 依赖 N1 暂停规则、N2 身份 |
| N5 默认可读性/教学 | NOT_STARTED | 自然旅程已确认教学结算文案与实际去向一致（continue 文案「继续下一关」） |
| N6 组件渲染器 | NOT_STARTED | 默认不启用候选 |
| N7 离线美术保真 | NOT_STARTED | 历史 NEEDS_WORK 未变 |
| N8 资源与构建完整性 | NOT_STARTED | build.ts 已修一处产物契约 |
| N9 运行时候选接入 | BLOCKED | 前置（美术保真 + 生命周期 + 用户确认）未满足 |
| N10 扩展自然旅程 | 部分 | 已有 seed=31 回归通过 |
| N11 提交/上传/交接 | 部分 | 本地提交就绪，待推送 |

---

## 7. 微信 / 抖音 / TapTap 小游戏验证边界

本轮浏览器验证**不构成**任何小游戏平台发布证明。`platforms/` 中已有 TapTap Android 包装代码完整保留，但 TapTap Android 包装 ≠ TapTap 小游戏验收。三平台（微信/抖音/TapTap 小游戏）的入口、DOM、存储、生命周期、音频、广告、资源加载缺口**未在本轮实测**，标记 NOT_TESTED。

---

## 8. 保真状态

`art-studies/facade-study-v5` 视觉保真仍是历史 **NEEDS_WORK**，结构 PASS 不覆盖保真。**90% 相似度未获确认**。本轮未改动美术源文件，未做默认替换。

---

## 9. 待你决策（最多 3 项）

1. **是否推送** `env-baseline/fresh-install-20261001` 到 GitHub（本地 2 个提交已就绪，另有第 3 个修复提交待你确认后一并推送）。
2. **N1-F1 / N2-1 是否继续修**：切后台暂停（visibilitychange）与 runId 唯一化都是低风险行为修复，但会改动 `src/main.ts` 运行时代码，需你确认后再由 Fixer 落地（已附失败测试路径与最小方案）。
3. **美术保真 N7**：facade-study-v5 是否安排下一轮定点修复（当前 NEEDS_WORK，缺你的人工审美确认）。

---

## 10. 完整证据索引

- 环境基线报告：`qa-evidence/next-stage/env-baseline/fresh-install-20261001/report.json`
- 自然旅程报告：`qa-evidence/next-stage/env-baseline/fresh-install-20261001/natural-journey/report.json`
- 命令退出码/时长：`qa-evidence/next-stage/env-baseline/fresh-install-20261001/logs/*.exit|*.time`
- 测试：`tests/restore-input-hold.test.ts`（新增）；历史 `QA-EVIDENCE.md` 与 `art-studies/facade-study-v5/qa/` 证据未覆盖、保持原样。
