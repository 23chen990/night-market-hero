# 夜市飞侠：护印突围 —— 正式工程 GitHub 基线

> 本仓库是《夜市飞侠：护印突围》的**唯一工程基线**，用于后续开发。
> 仓库内容取自本地正式工程 `runs/mobile-chart-adaptation-20260830/workspace/prototype-a`
> 的**当前磁盘状态**，原样保存，**未做任何重构 / 玩法 / 依赖 / 参数改动，也未清理代码或删除废弃副本**。

---

## 1. 正式工程入口

- 仓库根目录（即本仓库 `/`）就是正式工程根目录，与 `prototype-a` 一致。
- 源码入口：`src/main.ts` → `bootstrap()` → `FlightScene`（默认场景，使用 `NightCityRenderer` + `game-core`）。
- 页面入口：`index.html`。
- 打包脚本：`scripts/build.ts`（由 `npm run build` 调用）。
- 安卓 / 小程序打包工程在 `platforms/`（TapTap Android，已排除构建缓存）。

## 2. 技术栈版本

| 类别 | 版本 |
| --- | --- |
| 游戏引擎 | **Phaser ^3.90.0** |
| 语言 / 类型 | **TypeScript ^5.9.2** |
| 构建工具 | **Vite ^8.2.2** |
| 测试 / 工具 | `tsx ^4.20.5`、`@playwright/test ^1.62.1`、`eslint ^9.35.0`、`typescript-eslint ^8.41.0` |
| 包管理 | npm（仓库当前**未含** `package-lock.json`，安装以 `package.json` 为准） |

## 3. 安装 / 构建 / 测试

```bash
npm install            # 安装依赖（生成 node_modules，已被 .gitignore 忽略）
npm run build          # 构建（输出 dist/，已被 .gitignore 忽略）
npm test               # 测试：tsx --test tests/*.test.ts
npm run typecheck      # tsc --noEmit 类型检查
npm run lint           # eslint 检查 src/tests/scripts/vite.config.ts
npm run test:file      # tsx tests/file-launch-smoke.ts 单文件启动冒烟
```

## 4. 当前正式操作

- **仍然是单键玩法：按住 = 挂钩（grapple），松开 = 脱钩（detach）。**
- 桌面：`Space`；移动端：touch。
- 另有道具按钮（符 / 鞭炮）与暂停 / 竖屏锁定。
- ⚠️ v04 原型的 `A/D/W/Q/E` 多键**不是**正式操作，不得并入正式工程。

## 5. 长地图状态（重要）

- 当前**长地图仍未完成**。现有两套“无限”引擎：`district-world.ts`（视觉区块）+ `endless.ts`（玩法段）。
- 现阶段背景渲染器（`night-city-renderer.ts`）**只是把 6 张 v1/v2 全景图重复平铺 + 雾层遮罩**，存在“两张图硬拼”的已知缺陷（`district-transition-mist` 仅 0.08 透明雾层，非结构接缝）。
- 无限地图实施方案 v1.0 的 **15 段连续链 / 三方向实体过渡 / 六组接缝样板（192px tail/head）/ 组件式生产** 等**尚未在渲染器实现**，仅为计划。
- 长地图方案与背景接缝方案（如 `artifacts/background-stitch-plan-20260916.json`、`artifacts/experience-complaint-background-stitch-20260916.json` 等）保存在 `artifacts/`，作为开发判断资料。

## 6. v04 是参考样片，不是正式工程

> **v04 仅用于验证组件组景、环境动态、弹性挂点表现，不是正式游戏工程。其 A/D/W/Q/E 操作、Canvas 架构、测试物理参数等不得自动并入正式游戏。**

- v04 参考源码位于 **`reference/v04/`**（从 `handoff-kit` 的 `night-market-grapple-v04` 整包复制，含 `src/renderer-v04.js`、`src/grapple-physics.js`、`configs/`、`assets/`、`qa/`、`exports/` 与 `README.md`）。
- v04 演示了：组件图片 + Canvas 组景、弹性灯绳绑结（`elastic: mass2.4/stiffness42/damping9.5/maxOffset54`）、环境人物 / 船只活景（`ambient.json`）。
- v04 的 `grapple.json` 物理参数（如 `gravity:870 / maxGrapple:430 / minRope:72 / reelSpeed:105`）是**原型调参**，附件明确“正式接入需使用现有物理和世界单位重新检查”，**不得代填正式参数**。
- 正式工程接入 v04 思路的映射与边界见 `PROJECT_HANDOFF.md` §4.2 / §4.3 / 附件 02。

## 7. 已知废弃 / 兼容层（原样保留）

- `src/main.ts` 中的 `drawAuthoredRoute` / `addEnvironmentModules`，以及 `GateState` 部分字段标 `@deprecated`，属于**兼容层**，默认 `FlightScene` 不调用。
- 按基线要求，**未删除**这些代码，仅在此注明状态；详细以 `PROJECT_HANDOFF.md` 为准。

## 8. 资料与交接

- `PROJECT_HANDOFF.md`：开发交接依据（代码事实 + 边界确认 + 风险）。
- `QA-EVIDENCE.md` / `qa-evidence/`：QA 证据。
- `artifacts/`：运行证据、背景拼接计划、长地图方案、交接上下文等。
- `screenshots/`：产品体验截图。
- `platforms/`：TapTap Android 打包工程（已排除 `.gradle` / `app/build` / `*.apk` / 小程序构建产物等可重建缓存）。

## 9. 基线信息（baseline）

- **baseline tag**：`baseline-longmap-20260918`
- **baseline commit**：`c6f86e971600ade58af310c60ebe3db366e4d649`（首次正式基线提交，原样保存当前磁盘状态）
- **默认分支**：`main`
- **GitHub 仓库**：`https://github.com/23chen990/night-market-hero`（私有）
- 本基线**未做任何重构 / 玩法 / 依赖 / 参数改动**，也未清理代码或删除废弃副本。

## 10. 未上传 / 排除项说明

以下按任务要求**刻意排除**（均为可重建产物或构建缓存），不在本基线内：

| 排除项 | 原因 |
| --- | --- |
| `node_modules/` | 依赖，可 `npm install` 重建 |
| `dist/` | 构建输出，可 `npm run build` 重建 |
| `.vite/` | Vite 缓存 |
| `platforms/.../.gradle`、`app/build`、`*.apk`、`taptap-miniapp-build/` | Android / 小程序构建缓存与产物 |
| `夜市飞侠-护印突围-试玩版.html`（根目录，约 25MB） | 单文件可玩构建产物，可由构建重建 |
| `.DS_Store`、临时文件、`*.log`、`*.tmp` | OS / 临时文件 |

> 若后续需要将“试玩版 HTML”或 Android 原生产物纳入版本管理，请单独评估（建议用 Release / 制品，而非源码库）。
