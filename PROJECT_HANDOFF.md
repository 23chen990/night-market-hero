# 夜市飞侠：护印突围 · 开发与设计交接（PROJECT_HANDOFF）

> 生成日期：2026-09-18（Asia/Shanghai）
> 编写者：当前接手前的工程交接 Agent（只读核对，未修改工程）
> 适用范围：仅 `runs/mobile-chart-adaptation-20260830/workspace/prototype-a` 这一个工作区
>
> **状态标签约定（全文统一使用）**
> - 【用户已确认】来自用户原话 / 附件 02 / QA 记录，属意图层
> - 【代码已实现】在当前 `prototype-a` 源码中确实存在
> - 【实际已测试】有测试覆盖或 QA 报告记录的验证结果（标注“本次未重跑”的，是历史报告，本轮未重新执行）
> - 【仅建议/计划】无限地图实施方案 v1.0、附件中的方向，尚未落地
> - 【尚不清楚】看不到聊天/未读到文件/未执行测试，或代码与意图冲突处

---

## 0. 当前事实摘要（一页速读）

- **这是什么**：一个已可运行的横版钩锁摆荡动作网页原型（Phaser + TypeScript，包名 `night-market-hero-prototype` v0.1.0），别名“夜市飞侠：护印突围”。玩法主轴=按住挂钩摆荡、松手脱钩飞行，甩开官兵追兵、穿过坊门活门结算；另有 `night-patrol` 无尽模式（段式无限延伸）。
- **地图已是“无限”的两层引擎**：`district-world.ts`（视觉区块，1600px/块，market/rooftops/waterfront 三区按 seed 确定性循环）+ `endless.ts`（玩法段，1600px/段，变异/载具/检查点）。但**当前背景渲染器只是把 6 张 v1/v2 全景图重复平铺 + 雾层遮罩**，存在“两张图硬拼”的已知缺陷；**15 段连续链 / 实体过渡 / 接缝样板均未在渲染器实现**，只是计划（无限地图实施方案 v1.0）。
- **操作已确认是单键**：按住=挂钩，松手=脱钩；桌面 Space，移动端 touch；另有两个道具按钮（符/鞭炮）和暂停/竖屏锁定。v04 原型的 A/D/W/Q/E 多键 **不是** 正式操作。
- **护印/坊门/突围**：标题与文案里的“护印”目前只是叙事（护送铜符），**代码中没有受追踪的护印状态对象**；“坊门”= 关卡里的 closing-gate 追击事件（无尽模式里是中途检查点，不结算）；“突围”= 穿过活门（关卡胜利）或甩开追兵。
- **工程不在版本控制内**：`runs/` 被工厂仓库 `.gitignore` 忽略，prototype-a 无 branch/commit。无依赖锁文件，`node_modules` 未安装。**复现必须先 `npm install`（联网、按 semver 解析）再 `npm run build`**。
- **素材已齐但多数休眠**：63 张 png/22MB 全在 `src/assets`。活动渲染器只用 6 张全景+雾层+屋檐等；`approved-runtime/environment` 的 8 张建筑/道具组件图正是 v04 用来“组件组景”的同一批文件，但当前不在活动渲染路径上（仅 deprecated 兼容代码引用）。
- **测试**：存在 200+ 单元/集成测试，历史 QA 报告多轮全绿；**本次交接未重跑**（无依赖、范围为交接）。

---

## 1. 项目与一局玩法

### 1.1 启动 → 一局 → 阶段推进 → 结算/失败 → 重开（基于代码）

- **启动/进入**：`main.ts` 的 `bootstrap()` 用 URL `?seed=` 或默认 `seed=31` 创建 `createGrappleGame(seed)`；仅恢复 `lantern-entry`（教学）/`night-patrol`（无尽）快照。`levelCount=2`（教学 + 无尽巡逻），首局 `levelIndex=0`（教学 `lantern-entry`）。【代码已实现，`game-core.ts:886`、`main.ts:126`】
- **玩家持续做什么**：按住挂钩（摆荡），松手脱钩飞行，靠惯性+重力前进。**不是自动寻路**——角色 `x` 由速度积分推进，但基础 `vx>0`（起点 245，高空 +22/ tick、低空 −10/ tick），所以整体向前；节奏由玩家控挂钩/脱钩。【代码已实现，`game-core.ts:904,2063,2083`】
- **阶段推进（campaign）**：`progress = x / finishX` → `segmentForProgress()` 映射为 5 段：`safe-tutorial(<0.24) → first-pursuit(<0.49) → route-alternation(<0.79) → gate-climax(<0.99) → combo-flight`。【代码已实现，`game-core.ts:1545-1551,2101`】
- **“坊门/gate”推进**：campaign 中 `progress>=0.79` 进入 `closing-gate`，按 `gateProgress` 分 3 拍（beat 1/2/3），第 3 拍活门 `collisionAperture` 保持 ≥24 tick 且身体完整穿过 → `status='won'`。无尽模式（night-patrol）**永不 set 'won'**（同处有 `!this.endlessMode` 守卫）。【代码已实现，`game-core.ts:1766,2165-2178`】
- **失败**：`status='failed'`，`failureReason='caught'`（追兵接触）或 `'fell'`（`y>900` 或 `x<-180`）。【代码已实现，`game-core.ts:2196-2228`】
- **复活/重开**：失败后可看广告 `claimRevive()→reviveFromSafeState()`，条件 `progress>=0.6 && !reviveUsed`；结算卡按钮 `revive/double/restart/continue`；非 playing 时 `press` 直接 `resetGame(seed+1)`；无尽失败走 `restartEndless()`。【代码已实现，`game-core.ts:1217,1241,1265`、`main.ts:1203`】
- **无尽模式（night-patrol）**：无限向右，`x` 无界增长；段式玩法由 `endless.ts` 驱动（见 §3.4）；每第 4 段是 `isGate` 中途检查点，不结算；变异从段 3 起、载具从段 2 起。【代码已实现，`endless.ts`、`game-core.ts:841,2287-2315`】

### 1.2 操作方式（用户已确认 + 代码已实现）

- **核心手势只有一个“按住/松手”**：`press`=开始挂钩，`release`=脱钩飞行；**无独立点按/长按两套**；时长决定摆荡长度。【代码已实现，`game-core.ts:1262-1335`】
- **触控/指针**：`[data-action="grapple"]` 上 `pointerdown→dispatchGrapple('press')`，`pointerup/cancel→releaseOwnedGrapple()`；多指去重（`activePointerIds`）。【代码已实现，`main.ts:1325-1341`】
- **键盘**：`Space`（非 repeat、非交互元素）`keydown→press`、`keyup→release`。**仅 Space 一键**，无方向键/WASD/攻击键。【代码已实现，`main.ts:1352-1365`】
- **攻击**：**未在代码中找到**（无 attack；FORMAL_MANIFEST `inputs.actionButtons:[]`）。【代码已实现=无】
- **道具（两个，已接按钮）**：符 `talisman`（免疫危险，360 tick + 宽限 30）、鞭炮 `firecracker`（追兵停滞 180 tick）；首次免费，之后看广告解锁。【代码已实现，`game-core.ts:1221-1235`、`monetization.ts:134-150`、`main.ts:1380`】
- **其它控制**：`pauseButton`、`clearProgressButton`（localStorage 清档）、竖屏锁定暂停（portrait 冻结）、`blur` 取消挂钩。【代码已实现，`main.ts:1306-1389`】

> **冲突并列（重要）**：
> | 项 | 当前代码行为 | 用户确认意图（附件 02/QA） | 冲突影响 |
> |---|---|---|---|
> | 操作复杂度 | 单键 hold/release + Space，无攻击/无多键 | 保留已确认触控方式，不得因样片能多键就增加正式按键 | 若接手时误把 v04 的 A/D/W/Q/E 搬进正式工程，即违反已确认操作 |
> | 地图无限 | 已有 chunk + 段两套无限引擎 | 无限延伸 ≠ 无限时长一局、≠ 取消关卡/坊门/结算/失败/复活、≠ 换用 v04 操作 | 长地图接入若“顺手”删掉关卡结算或默认改多键，即破坏已确认规则 |

### 1.3 “护印 / 坊门 / 突围”术语含义与规则

- **护印**：标题 `夜市飞侠：护印突围`、`FORMAL_MANIFEST` 文案写“受托护送一枚原创盟契铜符”。**代码中没有名为护印/铜符/信物的 gameplay 对象或状态字段**——属叙事包装，非受追踪状态。【代码已实现=仅文案；规则=【尚不清楚】是否要落地为受追踪机制】
- **坊门**：代码对应 `GateState.expression='inner-market-gate'`、`anchoredTo='market-exit-arch'`，即 campaign 的 `closing-gate` 追击事件；无尽模式里每第 4 段是 `isGate` 检查点（不结算）。【代码已实现；用户确认意图=保留为关卡目标/结算点，不得因地图无限而取消】
- **突围**：非代码标识符（标题动词）。最近概念=（a）第 3 拍穿过活门达成 campaign 胜利；（b）持续甩开 `pursuer`（chase 阶段 safe/alert/danger/climax）。【代码已实现】
- **相近核心概念（已落地）**：`pursuer`=官兵追兵（加速度受 `宵禁加派` ×1.25 影响）；`wishfire`=愿火/金币（与 coins 同值）；`talisman`=符/护身符；`chase` pressure/distance 是胜负主轴线。【代码已实现】

### 1.4 玩家核心选择 / 威胁 / 奖励 / 失败 / 复活 / 恢复（基于代码）

- **核心选择**：手动挂钩/脱钩的时机；是否用符/鞭炮保命；是否看广告复活/翻倍愿火。【代码已实现】
- **主要威胁**：`pursuer` 追兵接触致死；坠落（`y>900`/`x<-180`）；变异（起雾/下雨/封灯/宵禁加派）改变锚点半径/重力/摆荡/追兵逼近。【代码已实现，`game-core.ts:1505-1536,1915,2195`】
- **奖励来源**：拾取金币（high-route/swing-apex/gate-brush/low-safety/backswing）；里程；过坊门；结算公式 `floor(里程米×0.12) + 拾取金币×连击倍率×深度系数 + 坊门数×8`。【代码已实现，`endless.ts:157,152`】
- **失败条件**：caught / fell（见 §1.1）。【代码已实现】
- **复活位置与恢复**：从安全状态 `reviveFromSafeState()`（优先不挂绳宽平台）；恢复前确认周边背景与玩法对象就绪；同一 seed/段/调度应恢复同一布局（快照 v1 落 localStorage）。【代码已实现，`run-snapshot.ts`、`game-core.ts:1241`】
- **新手引导**：UI 层实现（仅 `levelIndex===0` 时推进 按住→松手→拾金→棚救 四态）；无独立引导状态机。【代码已实现，`main.ts:472-489,190-194`；【实际已测试】`tutorial-visual-only.test.ts`】
- **局外成长/商店/广告/音频/UI**：见 §3.6 与 §6。

---

## 2. 唯一工程基线与复现方法

### 2.1 工程定位

- **工作区（唯一应接续的工程）**：`/Users/kker/Documents/ChatGPT/妖怪夜市/runs/mobile-chart-adaptation-20260830/workspace/prototype-a`
- **版本控制状态**：【重要】`runs/` 被工厂仓库根 `.gitignore`（第 2 行 `runs/`）忽略，**prototype-a 不在任何 git 中**，因此**没有分支/commit** 可指向它。工厂仓库根（`/Users/kker/Documents/ChatGPT/妖怪夜市`）在 `main` 分支、`HEAD=e15d69e`，但那是“工厂流水线”的提交，**不是本游戏的版本历史**。
- **导出时间/未提交修改**：磁盘当前状态即基线；prototype-a 无 git 跟踪，故“未提交修改”不适用（整目录即一手状态）。**本交接已将此目录打包为源码包**（见 §末尾“已交付文件”），排除项见下。

### 2.2 依赖与运行环境（实际声明）

- **运行时**：Node.js（构建用 `tsx`/`vite`；`vite@^8` 需较新 Node，建议 ≥18/20）。**本机未在 prototype-a 内安装依赖**（仅 `.vite` 缓存），故复现前必须安装。
- **引擎/物理库**：Phaser `^3.90.0`（渲染 + Arcade 物理由 game-core 自定义固定步长解算，未直接依赖 Phaser 物理）。TypeScript `^5.9.2`、tsx `^4.20.5`、vite `^8.2.2`、eslint `^9.35`、typescript-eslint `^8.41`、`@playwright/test ^1.62.1`（浏览器测试）。【代码已实现=package.json 声明；锁文件=【无】】
- **锁文件**：**不存在**（prototype-a 内无 `package-lock.json`/pnpm-lock.yaml；工厂根有 `pnpm-lock.yaml` 但不覆盖本游戏精确版本）。→ 复现性不被锁定，安装按 semver 取最新。**建议接手后生成并提交 `package-lock.json`。**

### 2.3 工作目录 / 安装 / 启动 / 构建 / 测试命令

```bash
cd runs/mobile-chart-adaptation-20260830/workspace/prototype-a
npm install            # 无锁文件，联网按 semver 解析；本机当前未装
npm run build          # tsx scripts/build.ts → 经 vite 产出单文件
                        #   dist/index.html 与 夜市飞侠-护印突围-试玩版.html（内联全部资源为 base64）
npm test               # tsx --test tests/*.test.ts（单元/集成，不含浏览器）
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npx tsx tests/file-launch-smoke.ts   # 用 file:// 启动试玩版并校验 Phaser canvas / 零错误
```

- **入口页面**：`index.html`（开发入口，双击会跳转到同目录试玩版）；构建后 `夜市飞侠-护印突围-试玩版.html` 为可双击自包含单文件（QA 验收强制要求）。
- **场景/入口类**：`main.ts` → `bootstrap()` → `FlightScene`（默认场景，使用 `NightCityRenderer` + `game-core`）；deprecated 的 `drawAuthoredRoute`/`addEnvironmentModules`（兼容层）默认不调用。
- **区分**：“自己执行过的命令与结果” —— **本轮未执行任何安装/构建/测试**（无依赖 + 交接范围），上表为从 `package.json`/`scripts/build.ts` 读到的声明；“实际已测试”见 §6 来自 builder 历史 QA 报告，已标注“本次未重跑”。

### 2.4 必要服务 / 缺失文件 / 环境变量 / 平台条件

- **无密钥**：prototype-a 无 `.env`/`.env.example`（已确认不存在）；广告为 mock（`MockAdProvider`/`NoopAdProvider`），TapTap 可注入 `window.__NIGHT_MARKET_HERO_TAPTAP_AD_CONFIG__`，无生产 SDK/credential。【代码已实现；【无密钥】】
- **平台构建**：`platforms/taptap-android/` 含 Android 宿主（`com.kker.nightmarkethero`、MainActivity、build.gradle、`构建APK.command`）；但 `app/build/` 与 `.gradle/` 为构建产物/缓存，未纳入源码包。
- **平台真机验证**：【尚不清楚】微信/抖音/TapTap 真机发布均未验证；当前仅为 web-lite QA 证据。

---

## 3. 代码地图与核心参数

### 3.1 模块地图（真实存在文件，附行数）

| 文件 | 行数 | 职责 | 关键导出/类 |
|---|---|---|---|
| `src/game-core.ts` | 2331 | **状态机核心**：物理固定步长、钩锁、选锚、坊门、追击、结算、复活、无尽 | `createGrappleGame`、`GrappleState`、`step()`、`advanceTicks` |
| `src/main.ts` | 1508 | 入口/bootstrap、`FlightScene`、输入绑定、HUD 渲染、UI 流程、广告接线、deprecated 环境模块 | `bootstrap`、`FlightScene` |
| `src/district-world.ts` | 216 | 纯函数、seed 可寻址的“三区视觉区块”调度（market/rooftops/waterfront） | `CITY_CHUNK_WIDTH=1600`、`cityChunksInView`、`districtAtX` |
| `src/night-city-renderer.ts` | 379 | 基于图片流的背景渲染器（全景 v1/v2 + 雾层遮罩 + 屋檐），有界对象池 | `NightCityRenderer`、`createNightCityRenderPlan` |
| `src/endless.ts` | 166 | 玩法“段”模型：难度、变异、载具、拾取、结算公式 | `segmentForIndex`、`chooseMutation`、`rollVehicleForSegment`、`settlementCoins` |
| `src/camera-layout.ts` | 131 | 世界→屏幕投影，固定竖向原点 | `createCameraLayout`、`projectCamera`、`LOGICAL_VIEWPORT=1672×941` |
| `src/run-snapshot.ts` | 75 | v1 快照、localStorage 读写、校验恢复 | `createRunSnapshot`、`LocalRunSnapshotStorage` |
| `src/progression.ts` | 14 | 角色/任务数据 | `CHARACTERS`(5)、`missionForProgress` |
| `src/monetization.ts` | — | 经济/广告策略（revive/double/talisman/firecracker 解锁） | `NightMarketMonetization`、`MetaProgress` |
| `src/ads.ts` | — | 广告 provider（mock/taptap/noop） | `MockAdProvider` 等 |
| `src/hud-layout.ts` | — | HUD 布局（1672×941 参考台，按视口缩放） | HUD 几何 |
| `src/ui-animation.ts` | — | UI 动画（reduced-motion 等） | — |
| `src/style.css` | — | 透明壳修复（修复跳跃露底色） | `#app` 全视口透明 |
| `scripts/build.ts` | — | vite 构建 + 内联资源为单文件 | — |
| `tests/` | 60+ 文件 | 单元/集成/浏览器冒烟 | `game-core.test.ts`、`formal-world.test.ts`、`endless-progression.test.ts` 等 |

> `src/XXpZ3NXE`（106KB）是 `game-core.ts` 的**陈旧副本**，main.ts 不引用，以 `game-core.ts` 为准。

### 3.2 角色 / 相机 / 背景 谁在移动，坐标关系

- **单一世界坐标系**：物理全程在世界坐标 `x`（向右增大）、`y`（向下增大）中进行；`finishX=2760`（关卡0），无尽 `x` 无界。【代码已实现，`game-core.ts`、`camera-layout.ts`】
- **相机**：`scrollX = player.x − worldViewportWidth×lookAhead(0.32)`，`scrollY` 固定为 `worldTop`（侧视横版，竖向原点不动）；`zoom = height/941`。【代码已实现，`camera-layout.ts:77,111-117`、`main.ts:742`】
- **背景**：`NightCityRenderer.render(scene, seed, scrollX, scrollX+width)`，按 `chunk.startX`（世界 x）放置、`scrollFactor=1` 随相机移动；角色与背景同一世界系，相机水平滚、竖向锁。【代码已实现，`night-city-renderer.ts:277-340`】
- **固定/变步长**：**固定步长 1/120 s + 累加器**（`step()` 把帧时长 clamp 0.1s 后按 `FIXED_STEP` 跑 `fixedTick`）。【代码已实现，`game-core.ts:330,1370-1379`】
- **锚点/碰撞/背景是否各用坐标**：**否**，均世界 x；锚点为点（距离判定），碰撞为圆 vs AABB，背景 chunk 索引 `floor(x/1600)`，无尽锚点 Y 借 `district` 的 `layoutId/variant` 微扰但 x 仍是世界坐标。【代码已实现，`district-world.ts:65`、`game-core.ts:666-681`】

> **接入注意（坐标基线不一致）**：`LOGICAL_VIEWPORT`/全景母版均为 **1672×941**，但 `CITY_CHUNK_WIDTH=1600`，`renderScale≈1.01` + overlap 补偿。接入 15 段连续链时需先统一基线（无限地图方案 §03 要求 P0 先测量换算系数），不要假设“一张图=一屏/一段”。

### 3.3 核心参数（当前值 / 单位 / 来源 file:line）

| 参数 | 当前值 | 单位 | 来源 |
|---|---|---|---|
| 重力 GRAVITY | 880 | px/s² | `game-core.ts:331`（下雨 ×1.05） |
| 摆荡驱动 SWING_DRIVE | 190 | 切向加速度 | `game-core.ts:332`（下雨 ×0.92） |
| 最大速度 MAX_SPEED | 840（无尽 +段序×28） | px/s | `game-core.ts:345,2150` |
| 玩家碰撞半径 | 12 | px（圆） | `game-core.ts:352` |
| 坠落线 FAIL_Y | 900 | px | `game-core.ts:346` |
| 关卡终点 FINISH_X | 2760 / 4800 / 6800 | px | `game-core.ts:347,392-406` |
| 最大绳长 MAX_PLAYABLE_ROPE_LENGTH | 360 | px | `game-core.ts:344`（挂接 `ropeLength=min(捕获距离,360)`） |
| 射程 attachRadius | 600 基准；关卡辅助 680–1000；无尽按段 | px | `game-core.ts:343,925`、`endless.ts:53` |
| 选锚 alignment 阈值 | ≥−0.15（re-grace 时 ≥−0.55） | 余弦 | `game-core.ts:1449-1450` |
| 高空选锚角度上限 | >1.28 rad 排除 | rad | `game-core.ts:1452` |
| 选锚评分 | 0.45×(d/attachRadius)+0.55×(angle/π)+同锚惩罚0.18 | — | `game-core.ts:1456-1461` |
| 脱钩连击阈值 | releaseSpeed≥360 | px/s | `game-core.ts:1316` |
| 再挂接宽限 REGRAPPLE_GRACE_TICKS | 24（仅绳长≤190） | tick | `game-core.ts:353,1310` |
| 追兵 MAX/MIN 距离 | 520 / 100 | px | `game-core.ts:350-351` |
| 追兵速度/加速度 | 520 / 1200 | px/s, px/s² | `game-core.ts:358-359` |
| 追兵接触距离 | 24（=2×半径） | px | `game-core.ts:360` |
| 固定步长 FIXED_STEP | 1/120 | s | `game-core.ts:330` |
| 跳跃 | **未找到**（无跳跃输入） | — | — |
| 收/放绳 | **未找到**独立控制（绳长=min(捕获,360) 自动） | — | `game-core.ts:1477` |
| 碰撞体 | 玩家=圆(12)；地形/障碍/门叶=AABB | — | `game-core.ts` 多处 |

> **严禁用 v04 参数代填**：v04 `grapple.json` 的 `gravity:870 / maxGrapple:430 / minRope:72 / reelSpeed:105` 等是**原型调参**，附件 02 明确“正式接入需使用现有物理和世界单位重新检查”。两者重力接近（870≈880）属巧合，不授权替换正式参数。

### 3.4 无尽“段”模型（endless.ts，玩法主轴）

- `BASE_SEGMENT_LENGTH_PX=1600`，`METERS_PER_PIXEL=1/30`，`speedMultiplierAtSegment=1+0.035×index`（段越长越快）。
- 段类型六类：`swing/terrain/fork/obstacle/sky/gate`；每 4 段一个 `isGate`；前 3 段固定（swing→terrain→gate）。
- 难度随 `block=floor(index/4)` 递增：锚点间距、辅助射程、坊门关闭 tick、追兵速度奖励。
- 变异 `chooseMutation`（起雾/下雨/封灯/宵禁加派）从段 3 起、近 2 段不重复。
- 载具 `rollVehicleForSegment`：纸鸢/货运滑索/灯笼群（段2起）、青鸾（sky 段6起）。
- 拾取 `pickupPlacementForSegment`：high-route/low-safety/swing-apex/gate-brush/backswing。
- 结算 `settlementCoins`：`floor(里程×0.12) + 拾取×连击倍率×深度系数 + 坊门×8`。【代码已实现，`endless.ts` 全文】

### 3.5 背景/地区/阶段 由什么触发

- **视觉地区（district）**：由 `district-world.ts` 按 seed 确定性循环（market→rooftops→waterfront），**对胜负零影响**——不决定段类型、不决定坊门、不影响追兵/结算，仅提供背景美术与锚点 Y 微扰。【代码已实现；与用户确认意图“保留关卡/坊门/阶段结算”不冲突，因为 district 只是装饰层】
- **玩法推进**：由 `progress`/`chase`/`segment(index)` 决定（见 §1.1、§3.4）；**不是**由 district 触发。
- **资源加载/回收**：`NightCityRenderer` 有界对象池（prefetch + maxRetained，超界销毁空闲图）；`district-world.cityChunksInView` 上限 `MAX_CITY_CHUNKS_IN_VIEW=8` 防无界相机。【代码已实现，`night-city-renderer.ts:236-251`、`district-world.ts:11`】

### 3.6 已实现 / 未实现 功能状态

| 功能 | 状态 | 说明 |
|---|---|---|
| 新手引导 tutorial | 【代码已实现】+【实际已测试】 | `main.ts:472-489`；`tutorial-visual-only.test.ts` |
| 局外成长 progression（CHARACTERS/MISSION） | 【代码已实现（数据层）】 | `progression.ts` 有 5 角色+任务；但**未找到角色选择/商店界面或 `spendCoins` 调用入口** |
| 商店 | 【未在代码中找到】 | 仅广告解锁道具，无 IAP/商店视图 |
| 广告/变现 ads/monetization | 【代码已实现】+【实际已测试】 | `ads.ts`/`monetization.ts`/`main.ts` 接线；`ads.test.ts`/`monetization.test.ts` |
| 音频 audio | 【未在代码中找到】 | 全 `src/` 无 AudioContext/`<audio>`（仅 tutorial 字符串） |
| UI 流程 | 【代码已实现】+【实际已测试】 | HUD 布局、结算卡、结果分支；`hud-slice.test.ts` 等 |
| 无尽模式 night-patrol | 【代码已实现】+【实际已测试】 | `endless.ts`+`game-core`；`endless-progression.test.ts`/`district-world.test.ts` |
| 角色动作图集 | 【代码已实现=代码剪影】 | `main.ts:81` TODO：用 approved 四帧动画替换几何体剪影；`approved-runtime/identity` PNG 休眠未接入活动渲染 |
| 组件组景 / 弹性挂点 / 环境人物船只 | 【仅建议/计划】 | 当前活动渲染器用全景平铺；v04 才演示组件+挂点+活景 |

---

## 4. 当前地图、状态与接入影响

### 4.1 当前地图实现状态（区分已实现/部分/未实现/未核验）

- **已实现**：无限 chunk（district-world，1600px/块，三区循环）+ 无限段（endless，1600px/段，变异/载具/检查点）+ 背景图片流渲染（night-city-renderer，6 全景 v1/v2 + 雾层 + 屋檐 + 有界回收）。
- **部分实现 / 已知缺陷**：**背景拼接**——相邻 1672 全景按 1600 摆放 + 轻微 overlap，过渡处用 `district-transition-mist-v1.png`（820×1919 竖向 RGBA，压到 ~300×941、`alpha=0.08`）遮罩；**这是“两张图硬拼”的可见切线缺陷**（见 `artifacts/experience-complaint-background-stitch-20260916.json`、`handoff-context-20260917.md`）。雾层只是遮罩，不能让两侧共享地平线/屋檐/灯笼光向/透视/水面反射。
- **未实现（计划，非代码）**：无限地图实施方案 v1.0 的 **15 段连续链 / 三方向实体过渡 / 六组接缝样板（192px tail/head）/ 组件式生产 / 单图流式加载与释放预算 / 弱网与生命周期**。当前渲染器**没有**这些；它只是重复 v1/v2 全景。
- **未核验**：手机性能、小游戏平台、真机 60fps、长时间 300 段稳定性——均为【尚不清楚/计划中的测试门槛】，非已验证。

### 4.2 长地图接入影响【仅建议】（本轮不改工程）

- **保留项（绝不可因“无限”而删）**：campaign 的坊门/阶段结算/失败/复活/奖励；已确认的单键操作；`progress`/`chase` 主轴线；`run-snapshot` 存档与幂等奖励。
- **可复用项**：`district-world.ts` 的 seed 调度（已无限）+ `endless.ts` 段模型（已无限）+ `NightCityRenderer` 的有界对象池/回收。
- **需适配项**：把 v1/v2 全景平铺替换为“连续背景链 + 真实建筑过渡”（参照无限地图方案 §04 的 6 接口 + 3 过渡；或 v04 的组件组景）。先接一小段兼容长图，回归原玩法后再扩。
- **冲突/风险**：若接入时把“地图无限”误解为“一局无限时长、不结算、无阶段目标、改多键操作”，即违反用户已确认（附件 02 §2、§5）。**必须显式保留**以上保留项。
- **回摆/正在连接的锚点/站立平台保护**：代码已用 `retentionBoundsAtSegment(seg-2, seg+3)` 与交互对象保护；接入流式加载时不得因离开视口提前回收正在挂钩的对象（无限地图方案 §07、§08 同此要求）。

### 4.3 组件组景 / 弹性挂点 / 环境活景 接入映射【仅建议】

| v04 已演示（参考，非正式） | 对应现有模块 | 接入建议 |
|---|---|---|
| 组件图片 + Canvas 组景（`scene.json` + `renderer-v03/v04.js`，10 张独立组件） | 活动渲染器是全景平铺；`approved-runtime/environment` 的 8 张组件图已存在但仅在 deprecated 兼容层引用 | 用现有 8 张 approved 组件（与 v04 同源文件）写/复活一个“组件组景器”，替代或并行于 `NightCityRenderer` 的全景平铺；保持世界坐标与 depth 层（-20 全景 / -10 屋檐 / -9 过渡） |
| 固定建筑挂点（横梁 `beam`，`grapple.json.anchors[0]`） | `game-core.ts` 现有锚点系统（按 x 选锚、alignment/angle 评分） | 给锚点增加“固定建筑支撑”类型与坐标登记，挂点须落在有墙柱/梁/桥台的结构上（符合画风边界） |
| 弹性灯绳绑结（`lantern`，`elastic: mass2.4/stiffness42/damping9.5/maxOffset54`） | 现有钩锁为“仅受拉距离约束”；无弹性绑结点 | 新增弹性绑结点类型：挂点随拉力偏移、松手保留人物速度、靠回位力+阻尼衰减（v04 README 明确“不是全绳有限元”）；用正式重力/绳长/可达性重新验证 |
| 环境人物 / 船只（`ambient.json`，7 人 + 3 船，装饰） | 活动渲染器无活景层；district-world 只给背景 | 新增装饰活景层（类 v04 `ambient.js`），按段/seed 配置；**明确无碰撞**（v04 `exclusions.ambientPeopleCollision=false/boatCollision=false`），且必须被柜台/栏杆/桥柱正确遮挡（depth） |
| 受力表现（街道横绳=静止弧线+挂点影响函数） | 钩锁末端/可见绳形由 `game-core` 状态驱动 | 复用 v04 的“挂点状态→绳形/灯笼吊点/提示环”单源读取思路，勿播放固定正弦动画 |

---

## 5. 素材现状与真正缺口

### 5.1 实际素材索引（63 张 png，合计 ~22MB，全部位于 `src/assets`）

| 类别 | 文件 | 字节 | 当前是否被活动代码引用 | 认可状态 | 说明 |
|---|---|---|---|---|---|
| night-city（活动背景） | market/rooftops/waterfront-panorama-v1/v2（6） | 各 ~1.5–1.8MB | **是**（night-city-renderer） | 用户认可风格方向（v2 更贴合冷蓝） | 当前平铺拼接；v1/v2 为同区两变体 |
| night-city | district-transition-mist-v1 | 1.28MB | 是（过渡遮罩） | 占位遮罩，**非结构接缝** | 已知缺陷：仅 0.08 透明雾层 |
| night-city | foreground-eaves-v1 | 524KB | 是（前景屋檐，depth -10） | 用户认可 | 独立 alpha 前景 |
| night-city | gate-counter-frame-v1 / settings-gear-v1 | 470KB / 738KB | 是（坊门框/设置） | 用户认可 | — |
| level1（活动 UI/特效） | closing-gate/pause/copper-token/escape-ring/grapple-attach-burst/impact-shards/landing-dust/near-miss-arc/parallax-*/pursuit-warning/speed-streaks/tutorial-*（共 24） | 各 11–215KB | 是（关卡/教学/追击特效） | 用户认可 | 含教学四态图标 |
| approved-ui（活动 UI） | back-button/grapple-attached/destination-*/hud-icons/night-market-ad-play/night-market-item-ring/night-market-talisman(v1/v2)/safe-state/ui-f-night-market-interior/user-generated-token-banner/wishfire（共 16） | 各 4–1.56MB | 是（HUD/按钮/广告/愿火） | 用户认可 | `ui-f-night-market-interior` 1.5MB 疑为内部图 |
| approved-runtime/hub（商店 UI） | anchor-button/back-key/gate-strip-*/inventory-*/money-shell-*/money-value*（共 11） | 各 4–1.15MB | 被代码引用 9 次（商店/局外 UI） | 用户认可 | 部分可能 dormant |
| approved-runtime/identity（主角/追兵） | protagonist-swing-base-v1(10.6KB) / pursuer-run-base-v1(6KB) | 小 | 被引用 2 次，但**活动渲染用代码剪影** | 用户认可参考 | **未接入活动渲染**（TODO 待替换几何体剪影） |
| approved-runtime/environment（建筑/道具组件） | bamboo-scaffold/blank-banner/covered-alley-frame/inner-eave/lantern-cable/paifang-crossbeam/pushcart/stall-canopy（8） | 各 38–84KB | 被引用 8 次（仅 deprecated 兼容层） | 用户认可 | **与 v04 用来组景的是同一批文件**；当前不在活动渲染路径 |

> 素材“已存在 / 已被引用 / 用户认可 / 可发布”分别记录，不互相替代。文件名含 `approved-*` 不等同于通过发布验收（见 §6 否决/验收边界）。

### 5.2 真正缺口（最小补制清单，每项对应真实玩法需求）

1. **连续背景链 + 实体过渡的成品图**（无限地图方案 §05：先 15 张常规 + 3 过渡，再 27）。当前只有 6 张 v1/v2 全景 + 雾遮罩；**需按母版/接缝样板生产**，不是再生成整张效果图。→ 对应需求：修复拼接缺陷、支持三区真实建筑过渡。
2. **角色动作图集**（4 帧摆动 + 落点等）：approved `protagonist-swing-base-v1` 是单张参考，需补帧序列并接入活动渲染（替换代码剪影）。→ 对应需求：主角表现。
3. **弹性灯绳/灯笼动态渲染资产与挂点配置**：v04 为程序绘制；正式需决定美术（灯笼挂点结构）与挂点数据契约。→ 对应需求：弹性挂点表现。
4. **环境人物/船只组件与按段配置**：v04 已有 sampan/cargo-boat 等组件与 `ambient.json`，可直接复用其图与配置思路；需补“装饰层 + 遮挡”实现。→ 对应需求：用户要求加入的自然走动人物与河边船只。
5. **音频资产**：全缺（无声）。→ 对应需求：未定义，非阻塞。

> 不在工程内、需单独提供的素材：**无**（上述组件/角色/UI 素材均已在本工程 `src/assets` 内）。v04 的 `assets/` 组件图与本工程 `approved-runtime/environment` **逐文件同名同源**，无需重复打包。

---

## 6. 决策记录、否决方案与已知问题

### 6.1 用户明确认可（意图层，来自附件 02 / QA 记录）

- 中国水乡夜市、手机横屏、冷蓝/青蓝夜色、克制暖黄灯笼、低曝光、分层剪影、平面色块、轻材质、弱体积；建筑必须有可理解的墙柱/梁/桥台支撑，灯笼有真实挂接结构。【用户已确认】
- 连续背景链（闹市→实体过渡→屋脊→实体过渡→水市→实体过渡→闹市）；先每区 4 段 + 3 过渡共 15 段验证，再扩 27 段；不立即生产 100 张。【用户已确认】
- “美术组件＋代码组景”而非只生成整张效果图，也非强求纯代码；静态建筑/支撑可分组缓存/导出，人物/船/动态灯笼/受力绳索为独立对象；动态角色/船须被正确遮挡。【用户已确认】
- 固定建筑挂点 + 承重灯绳绑结小幅弹性挂点；v04 受力感觉被认可（“受力我觉得还不错可以这么做”）——**仅限受力方向，不等同美术定稿/控制定稿/参数平衡/无限地图完成**。【用户已确认·边界明确】
- 保留原工程已确认触控方式（单键 hold/release），不因样片多键而增键；长地图不取消关卡/坊门/结算/失败/复活/商业化规则。【用户已确认】
- 1672×941 为原背景母版/分段基线；同一世界坐标累积，不随手机尺寸改物理单位，不用逐张拉伸/渐变掩盖错接。【用户已确认】

### 6.2 已否决 / 不应重新讨论

- 用 CSS 渐变或 Phaser Graphics 画场景（必须用 raster 素材；见 `handoff-context-20260917.md` 与 `night-city-renderer.ts` 注释）。【否决·代码已落实】
- v04 的键盘 A/D/W/Q/E 多键操作、试验主角、三处木台、失足自动安全复位、独立 Canvas 架构、预置试荡片段 —— **均不自动成为正式规则**（附件 02 §4）。【否决·边界】
- v04 参数（gravity870/maxGrapple430 等）不代填正式参数。【否决·边界】
- 立即生产 100 张；链尾强行接回链头；用 560px 旧桥接素材直接当完整换区段。【否决·计划边界】
- 为做无限背景顺手重写全部玩法 / 升级引擎 / 更换物理库 / 改动经济。【否决·边界】

### 6.3 已知问题 / Bug / 待办（来自代码注释 + QA 记录 + 本交接核对）

1. **背景硬拼缺陷**（已记录为经验投诉 `experience-complaint-background-stitch-20260916.json`）：v1/v2 全景 + 0.08 雾遮罩，非结构接缝。→ **核心阻塞**（见 §末尾）。
2. **布棚弹跳已延期**：`CANOPY_BOUNCE_ENABLED=false`（`game-core.ts:363`），触碰直接 `ready` 跳过；保留数据供改版。【代码已实现=故意关闭】
3. **角色动画未接入**：`main.ts:81` TODO，活动渲染为代码剪影，approved 四帧未用。
4. **音频缺失**：无 AudioContext/`<audio>`。
5. **兼容/废弃渲染器**：`drawAuthoredRoute`/`addEnvironmentModules`/`GateState` 部分字段标 `@deprecated`，默认 FlightScene 不调用。
6. **浏览器冒烟在某些受管环境无法跑**（macOS Mach-port 限制），相关迭代 QA 报告标注“未记录 browser-smoke pass”。
7. **坐标基线不一致**：全景 1672 vs chunk 1600（见 §3.2），接入 15 段前需统一换算。
8. **工程不在 git + 无锁文件 + node_modules 未装**（见 §2）：复现性风险。

### 6.4 验证状态（区分已测/未重跑）

- **实际已测试（builder 历史报告，本次未重跑）**：`QA-EVIDENCE.md` 记录多轮 `npm test` 全绿（最多 226 total：216 pass/10 skip）、`npm run build` 产出单文件、`npx tsx tests/browser-smoke.ts` 在 1180×720 / 844×390 / 390×844 通过、零 console/page error；最近一次 production hash 与截图 hash 记录在 `artifacts/ui-gameplay-mismatch-fix-evidence-20260903.json`。**这些是 builder 自己跑的，本轮交接未重新执行**（无依赖 + 范围为交接）。
- **未重跑声明**：安装/构建/测试命令见 §2.3；本轮**未执行**任何 `npm install`/`build`/`test`，故不能宣称“当前可运行已验证”，只能说“代码与历史 QA 报告表明可运行”。
- **模拟视口/真机 ≠ 真机实测**：v04 与正式工程的浏览器视口模拟均非手机真机测试；平台（微信/抖音/TapTap）发布验证【尚不清楚】。

---

## 7. 接入建议与接手第一步（只建议，本轮不改工程）

### 7.1 第一步【仅建议】（强烈建议，顺序不可乱）

1. **复现基线**：按 §2.3 在独立副本/分支安装并 `npm run build`、`npm test`、`npm run typecheck`，双击 `夜市飞侠-护印突围-试玩版.html` 跑通一局（教学→结算/失败→重生），记录当前 hash/帧/参数作为基线。**先别碰功能**。
2. **小段对照接入**：在副本中先接“一小段兼容长地图 + 固定/弹性挂点”对照，回归原玩法（操作、失败/复活、关卡结算、切后台、回摆、正在挂钩对象保护）后再扩到三地区与 15 段验证规模。
3. **先 P0 再 P1**（无限地图方案 §14）：先测坐标/镜头/速度基线 + 真机 2–3 张滚动/释放；再 6 接缝样板 + 3 过渡灰盒 + 主背景同速 + 共同 RunPlan。
4. **不放大的边界**：不同时扩写经济、广告或新敌人；不升级引擎/换物理库/改经济/重做角色控制。

### 7.2 接入映射【仅建议】（已列于 §4.3）

- 组件组景 → 用现有 `approved-runtime/environment` 8 张同文件组件写/复活组景器，替代全景平铺，保持世界坐标与 depth。
- 长地图 → 扩展 `district-world` + `endless`（已无限），不要删 campaign 结算。
- 弹性挂点 → 给 `game-core` 锚点系统加“固定建筑锚 + 弹性绑结点”类型，用正式重力/绳长重新验证可达性。
- 环境人物/船只 → 新增装饰活景层（类 v04 `ambient.js`），无碰撞、须被遮挡。

### 7.3 最多 5 个真正阻塞接入的问题

1. **工程不可复现的元数据缺失**：prototype-a 不在 git（runs/ 被 ignore）、无锁文件、`node_modules` 未装。接手者必须先 `npm install`（联网、semver 解析）才能跑；建议生成并提交 `package-lock.json`。这是复现一切的前置阻塞。
2. **背景拼接缺陷未修 + 15 段连续链未实现**：当前仅 v1/v2 全景 + 雾遮罩硬拼，连续链/实体过渡/接缝样板均未落地（仅计划）。这是“长地图/组件组景”接入的核心阻塞。
3. **控制方案冲突风险**：代码=单键 hold/release + Space；v04 多键（A/D/W/Q/E）不得进入正式工程。接入时必须显式保留已确认单键，避免误替换。
4. **角色动作图集与挂点/活景接入点未定**：approved identity PNG 休眠（代码剪影），弹性灯绳/固定挂点/环境人物船只仅在 v04 参考中，正式引擎接入点未设计。
5. **平台发布验证缺失**：微信/抖音/TapTap/真机均未经发布验证；当前仅为 web-lite QA 证据，广告为 mock，无真实 SDK/credential。

### 7.4 结尾清单

- **已交付文件**：本 `PROJECT_HANDOFF.md`；源码包 `夜市飞侠-护印突围-正式工程源码包-20260918.zip`（见下）。
- **当前工程版本**：磁盘状态（无 VCS）；工厂仓库 `main@e15d69e` 不覆盖本游戏；`package.json` 版本 `0.1.0`，Phaser `^3.90`。
- **可复现步骤**：见 §2.3（install → build → test → 双击试玩版）。
- **缺失项**：锁文件；node_modules；背景连续链 15 段成品图；角色动作图集；音频；平台真机验证；完整聊天记录（本交接只读可见材料）。
- **阻塞项**：见 §7.3。
- **接手第一步**：见 §7.1。

---

## 附：本交接的可见性边界（重要，避免误读）

- **本交接依据**：实际读到的工程代码（`src/*`、`package.json`、`scripts/build.ts`）、`QA-EVIDENCE.md`、`artifacts/`（含 `handoff-context-20260917.md`、`background-stitch-plan-20260916/*`、`experience-complaint-*`）、附件 `00/01/02` 与 v04 源码（`scene.json`/`grapple.json`/`ambient.json`/`README.md`）。
- **未看到/未读到**（已显式标注）：此前用户与原开发 Agent 的**完整聊天记录**；未在工程中、也未在本附件中的任何“另一 Agent 持有”的额外资料；v04 之外任何未提供的原型。
- **未执行**：任何 `npm install` / `build` / `test` / 游戏实跑（无依赖 + 交接范围）；所有“已测试”结论均引自 builder 历史 QA 报告，标注“本次未重跑”。
- **不编造**：凡代码未找到或意图未定义，均标【尚不清楚/未在代码中找到】；代码与用户确认意图冲突处已并列（§1.2、§1.3、§4.2）。
- **不含密钥**：已确认 prototype-a 无 `.env`/`.env.example`、无 credential；广告为 mock。
