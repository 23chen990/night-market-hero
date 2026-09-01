# AI 小游戏工厂：通用生产架构

## 产品边界

本仓库交付的是可重复生产轻量小游戏的本地工厂，不是一款固定游戏。共享控制平面负责需求路由、阶段
契约、模型权限、结构化证据、暂停恢复和发布门禁；每条玩法母版负责自己的体验指标、原型、内容生成、
UI 约束、自动试玩策略和性能预算。默认面向一人团队的微信、抖音、TapTap 小游戏与可选海外 H5，采用
短局单机和 IAA 边界。`codex-account` 复用 Codex CLI 已有的登录会话，不读取认证文件；没有数据库、
队列、容器或自建支付后台。

## 确定性状态机

```text
CREATED → 产线/业务/研究 → 蓝图与体验假设 → CORE_SPEC_FROZEN
  → profile 专项原型与 QA → 内容/UI/美术/素材 → FULL_BUILD
  → QA（核心 + 正常流程 + runtime-product）→ FINAL_PROFILE_QA
  → 视觉证据 → 内容差异 → 质量/原创性/供应链
  → 候选包 → 盲测/最终人工试玩 → 三平台独立 QA → RELEASE → COMPLETED
```

`pipelineMode: fast-reskin` 是本地快速候选线；`pipelineMode: full-validation` 不允许跳过已声明的
profile 阶段。当前真正有模板和运行适配器的只有 `idle-shop-v1`、`spatial-shop-v1`、
`spatial-shop-3d-v1`。动作/切割、叙事和解谜已注册契约与指标，但能力检查会在缺模板时暂停，不能
把 idle 模板当作替代品。

兼容实验可通过 `designMode: prototype_tournament` 显式进入旧的
`COMPETITOR_RESEARCH -> IDEA_GENERATION -> ... -> WAITING_FOR_PROTOTYPE_APPROVAL`
路径，但 RequestRouter 和普通新 seed 都不会默认选择它。

对已有 demo 的后续请求不再默认把“批准”解释为发布许可。RequestRouter 将“demo 已批准后扩展关卡/完善玩法/产品化”识别为
`PRODUCTIZATION_REVISION`，其计划顺序固定为
`EXPERIENCE_CONTRACT -> FEEL_PROTOTYPE -> NATURAL_PLAY_QA -> EXPERIENCE_REVIEW -> CONTENT_EXPANSION -> UI_SKELETON -> FULL_BUILD -> QA`；
体验评审在手感或自然游玩失败时只能转入 `FEEL_REPAIR`，不能直接标记批准。扩容阶段先产出可重复游玩的代表性内容，UI 阶段先锁定功能信息架构，
再进入正式构建。明确要求深度竞品还原的已有游戏请求会先经过
`REFERENCE_DEEP_RESEARCH -> REFERENCE_MECHANIC_LOCK -> WAITING_FOR_REFERENCE_APPROVAL`，把证据、机制保真清单和原创表达边界锁定后才允许实现。

体验阶段使用三个可复用的 Zod artifact：`ExperienceContract`（应该感觉如何）、`NaturalPlayPlan`（普通玩家如何验证）和
`ExperienceReviewReport`（机制、手感、自然游玩、表现分别是否通过）。它们独立于具体引擎和题材，可用于放置、动作、经营和叙事游戏。

体验合同进一步由 `ExperienceProfile` 驱动，而不是让所有游戏共用动作手感标准。当前 profile 包括
`ACTION_FEEL`、`NARRATIVE_AGENCY`、`STRATEGIC_SYSTEM`、`PUZZLE_CLARITY`、`SOCIAL_EMOTION` 和
`EXPLORATION_DISCOVERY`，可附加 `NATURAL_PLAY`、`REPLAY_VALUE` 或 `PROGRESSION_FEEDBACK`。例如动作游戏走
`FEEL_PROTOTYPE -> NATURAL_PLAY_QA -> EXPERIENCE_REVIEW`，叙事游戏走
`STORY_VERTICAL_SLICE -> CHOICE_CONSEQUENCE_QA -> NARRATIVE_REVIEW -> REPLAY_VALUE_QA`，策略游戏走
`SYSTEMS_PROTOTYPE -> STRATEGY_QA -> PROGRESSION_REVIEW`。路由会依据请求和模板推断 profile，但 profile selection 保留为独立 artifact，
允许人类在进入生产前覆盖推断结果。

验收证据不再只依赖截图和一个 `passed` 布尔值。`AcceptanceManifest` 为每个 profile 声明主体验、真实游玩任务、禁止的
debug/oracle 捷径、成功/失败指标和必需证据；`PlaytestTrace` 按时间记录 reset、真实输入、状态、反馈、失败/成功事件；
`ProfileReviewReport` 分开给出主体验、技术、自然游玩和重玩价值结论。主体验失败、自然游玩失败或出现 blocker 时，报告只能进入
`REWORK`，不能静默放行到 Release。

`runs/<run-id>/state.json` 是唯一运行状态真相。每个 stage 保存状态、时间、尝试次数、输入、
输出、错误、Provider 调用次数、Token usage 和机器可检查的 evidence。Artifact 先通过 Zod 校验，再用临时文件加 rename 原子写入。
普通恢复按 `state.json` 跳过已完成 stage；`NO_PROTOTYPE_WINNER`、`DESIGN_REJECTED` 与 `COMPLETED` 都是幂等终态，重复
`resume` 不重写状态或发行产物。失败 stage 的
`retry` 保留错误历史并递增 attempts。发行目录通过 release manifest 中的 SHA-256 做完整性核验。

真实 Builder 是一个有独立预算的长任务：`CODEX_BUILD_TIMEOUT_MS` 默认 900000 毫秒（15 分钟），
Fixer 使用 `CODEX_FIX_TIMEOUT_MS` 默认 600000 毫秒（10 分钟）。Builder 返回后，工厂在生成的
`workspace/game` 内本地运行 `pnpm test`、`pnpm typecheck`，再执行生产构建；只有全部通过才会写入
成功的 `artifacts/build-report.json` 并进入 QA。该报告的 `verification` 保存可复核证据，至少包括
`contract:test-api-7`、`save:versioned`、`test:passed` 和 `typecheck:passed`。

若 Codex Builder turn 已完成但工厂侧验证失败，`verify-build <run-id>` 提供无模型恢复路径：它要求
FULL_BUILD 已失败，并从 `logs/codex/BUILD.attempt-1.stdout.jsonl` 读取已保存的 JSONL；只有其中存在
`thread.started`、带 thread ID 的 `turn.completed`，且没有 `turn.failed` 时才会复用现有
`workspace/game` 重新执行本地验证。成功后写回 `build-report.json` 并恢复流水线，整个过程不再
调用 Codex、不创建新 thread，也不重复消耗账号额度。若没有完整的 completed JSONL 证据，则命令
拒绝恢复，应修正问题后使用受控的 `retry`。

默认制作前硬 Gate 是人类锁定的 `ReferenceMechanicSpec`（参考入口）或原型竞赛的选择（创意入口）。它们记录核心循环、玩家动作、成长系统、解锁规则、反馈节奏、必须保持和可调整的机制关系；参考入口的 `lockedBy` 必须是 `human`。`CORE_SPEC_FROZEN` 现在只负责生成机器可读的验收标准，不冒充一次人工审批；`WAITING_FOR_ART_APPROVAL` 的一次性 `approve` 会把玩法结果、UI/美术方向写入 canonical `CORE_DEMO` 台账。这样参考/原型前置锁定不会和核心 Demo 重复计数。

参考机制获批后，必须先完成 `OPEN_SOURCE_RESEARCH`，生成并验证
`artifacts/open-source-research.json`；技术蓝图 `game-blueprint.json` 必须把它列为输入 Artifact。
没有合适候选是合法结论，但缺少仓库 URL、固定版本、许可证证据或风险判断的候选不得进入复用清单。

人工门不是错误：生成四个方向和静态 review 页面后，状态为
`WAITING_FOR_ART_APPROVAL`。`resume` 只在 `human/art-approval.yaml` 存在且有效时继续。

Codex CLI 尚无稳定的非交互图片输出路径契约，因此 imagegen 也是可恢复的正常等待门。Orchestrator
先保存包含四个 `$imagegen` 任务的 Markdown；只有指定 PNG 全部存在且文件签名有效，`resume` 才继续。
它不会用 Mock SVG 或几何占位图满足该门。

## 组件

- `Orchestrator`：唯一调度者；按固定顺序调用岗位，不允许岗位自由聊天。
- `CompetitorResearchAgent / OpenSourceResearchAgent / ProductionCostReviewerAgent / IaaMonetizationReviewerAgent / GreenlightAgent / ProducerAgent / ArtDirectorAgent / StyleLockAgent / AssetProducerAgent / BuilderAgent / QAAgent / FixerAgent / ReleaseAgent`：只接受和
  产出 Schema 验证的 JSON Artifact。只有 Builder/Fixer 可以写 `workspace/game`。
- `AgentProvider / CodexProvider / ImageProvider / RuntimeProvider / QAProvider`：外部能力边界。
  默认 Mock；`FACTORY_MODE=codex-account` 使用同一个 `CodexCliProvider` 驱动结构化文本 Agent 和
  Builder/Fixer。旧 API Provider 保留为可选兼容扩展，不是 codex-account 依赖，也不存在失败后回退 Mock。
- `CodexCliProvider`：用 `child_process.spawn` 安全传参；JSONL、Schema、最终输出和日志都落在 run
  内。Producer/ArtDirector/StyleLock 使用 `read-only`；Builder 以生成游戏目录为 cwd 使用
  `workspace-write`；Fixer resume Builder thread。Builder 使用 `CODEX_BUILD_TIMEOUT_MS`，Fixer 使用
  `CODEX_FIX_TIMEOUT_MS`；禁止 `danger-full-access`。
- `CodexImagegenProvider`：写图片接力任务并验证实际 PNG；方向预览固定四张，正式素材使用相同门禁。
- `WebLiteRuntimeAdapter` / `Cocos3dRuntimeAdapter`：从版本化模板创建项目、启动预览和构建 Web 或
  Cocos 产物。Web-lite 只用于浏览器玩法验证和自动 QA，不是微信、抖音或 TapTap 的可发布包。
- `PlatformSpine` 与平台子包目录：为微信、抖音、TapTap（可选海外 H5）分别保存适配器、配置、包哈希、
  真机/等价设备证据；任何一个子包都不能继承另一个平台的通过状态。
- `FileRunStore`：创建 run、原子保存状态和 Artifact、记录 JSONL 日志。
- `factory` CLI：薄入口，不复制业务规则。

`pnpm factory verify-build <run-id>` 是 Builder 失败后的受控本地复核命令。它只适用于
`FACTORY_MODE=codex-account` 且存在可证明已完成的 Builder JSONL；它不会静默重新调用 Codex。

## 目录

```text
src/{agents,adapters,cli,core,providers,schemas}/
templates/web-lite/idle-shop-v1/
.agents/skills/<repo-skill>/
examples/seeds/
tests/{unit,integration,e2e}/
runs/                         # 运行产物，git 忽略
```

## web-lite 游戏契约

玩法逻辑读取生成的 `src/generated/game-config.json`，不硬编码主题、文案、数值或素材路径。
状态是纯数据并以带 `version` 的 JSON 写入 localStorage。UI 使用响应式 DOM 覆盖层和 Phaser
Scale FIT；状态变化通过一次 render/event 路径更新。页面暴露确定性测试接口：
`resetGame/getState/spawnCustomer/completeOrder/grantCurrency/upgradeStation/setRandomSeed`。

Builder 输入还会注入经 Zod 校验的 `uiAnimationStandard`。UI 动效默认使用少量关键姿势与运行时
时间补间，不使用逐张独立生成的 AI 中间帧；纹理须预加载，30/60/120 Hz 下语义终态一致，并支持
`prefers-reduced-motion`。完整约束见 [UI 动画连续性规范](./ui-animation-continuity-standard.md)。

## 三平台发布目标

所有 seed 默认固定包含 `wechat-minigame`、`douyin-minigame`、`taptap-minigame`，技术蓝图必须原样
保留。平台发布适配须遵守 [三平台发布与开源复用政策](./platform-publishing-policy.md)。在对应
适配器、平台配置、独立包哈希、真机/等价设备 QA 和提审包均有机器证据以前，Release 只能称为 Web
release candidate，不能标记任一渠道 ready。

## 失败、QA 与发行

QA 启动已构建 Web 预览，Playwright 优先调用测试接口验证经营闭环，再验证 Canvas 可见、无
console error，并保存截图和日志。失败报告成为 Fixer 的唯一修复范围；最多两轮。超过上限则
`FAILED`，不发布。Release 先冻结并复制已验证的 Web 候选及报告到 `release-candidate/`，再按配置要求
核验每个目标平台的独立子包；没有平台证据时只能保留候选，不能宣称渠道发布。

Builder 的 `test`、`typecheck` 与生产构建结果必须出现在 `build-report.json` 的
`verification` 数组中，作为进入 QA 的前置证据；`verify-build` 复用 completed JSONL 时也必须重新
生成同样的验证证据。

审批 YAML 无效也属于 `STYLE_LOCK` stage 的受控失败：state 顶层进入 `FAILED`，stage 保留错误，
修正审批后可用 `retry <run-id> STYLE_LOCK` 恢复。

## 安全与可替换性

Mock 模式不联网且可完整 E2E。codex-account 的认证完全交给本机 Codex CLI；工厂既不要求 API Key，
也不读取 `~/.codex/auth.json`。所有结构化输出仍须通过现有 Zod Schema。每个 Codex stage 最多首调
加一次有限重试，并支持超时和取消；调用次数和 token usage 写入 state 与 `provider-usage.json`。
stdout、stderr、事件和错误统一脱敏。模板、Adapter 和 Provider 都可以独立替换，不改变 Orchestrator
的 Artifact 边界和暂停恢复语义。
