# AI 小游戏工厂

这是一个本地、可暂停恢复的 AI 小游戏工厂。普通新游戏请求进入原创原型流程：先生成候选并通过原型证据门禁，再等待人工审阅。明确指定参考游戏时，进入参考适配流程，通过 `referenceMechanics` 锁定通用机制关系。省略 `designMode` 的 seed 会根据是否提供 `referenceMechanics` 选择对应入口；也可以显式声明 `prototype_tournament` 或 `reference_reskin`。代码、素材、名称、文案、UI 布局、音频和具体数值必须保持原创。

所有游戏默认面向微信小游戏、抖音小游戏和 TapTap 小游戏。参考游戏默认走
`replica-preview` 短流程：run 内证据绑定与用途隔离 → 五维行为分析 → 机制确认 → 产品体验契约 → 单一核心切片 → 独立工程/感知 QA → 真人核心试玩。
它只回答“核心玩法是否被正确复刻”，不会把开源、IAA、平台适配和发布检查伪装成预览已完成；这些门禁
必须在显式的 full-validation/release 流程中处理。当前 `web-lite` 产物仍只是浏览器玩法验证与 QA 候选，
不等同于三平台可提审包；详细边界见 [三平台发布与开源复用政策](docs/platform-publishing-policy.md)。

## 环境检查

```bash
pnpm install
pnpm factory doctor
```

`doctor` 检查 Node.js、pnpm、Codex CLI、`codex login status`、`codex exec`、JSONL、JSON Schema、resume、`workspace-write`、Playwright、imagegen 能力和当前运行模式。它只检查命令与帮助信息，不发起模型调用，也不读取 `~/.codex/auth.json`。

若登录项失败，只需执行：

```bash
codex login
```

## 启动一次参考机制换皮制作

`examples/seeds/relic-revival-workshop.yaml` 是“我要当美女”的参考机制 seed：参考对象只用于锁定通用机制，题材与表现层均为原创。

```bash
run_id=$(FACTORY_MODE=mock pnpm --silent factory new examples/seeds/relic-revival-workshop.yaml)
FACTORY_MODE=mock pnpm factory run "$run_id"
```

Run 会先检查 `referenceMechanics.source.researchFiles` 和 `reference-evidence/manifest.json` 是否绑定到当前 run。已核验证据必须带用途；只有 `gameplay-reference`、`design-document` 与 `code-reference` 会进入竞品行为分析，平台日志和包身份材料不会污染玩法契约。ResearchAgent 会自动生成
`artifacts/reference-behavior-analysis.json`，并在 `reference-evidence-pack.json` 中写入带来源路径、哈希和定位的五类 `behaviorChecks`：输入/状态、空间关系、失败/恢复、反馈顺序、终点/重玩。任一维度缺失或仍是未知都会停在 `REFERENCE_DEEP_RESEARCH`。证据与逐场景分析通过后才会停在
`WAITING_FOR_REFERENCE_APPROVAL`。检查 `runs/<run-id>/human/reference-mechanic-review.json` 后确认或拒绝：

`evidence:ingest` 默认把材料绑定到标准生成工作区 `runs/<run-id>/workspace/game`。只有审计历史项目时才显式传入旧工作区。启动或续跑前可执行：

`--target-game` 必须是 run 身份清单里的游戏 id，研究阶段按它核对证据；填 run id 会被判为目标不匹配。下面的示例都用 `$game_id`：

```bash
game_id=$(node -e 'const i = require(process.argv[1]); console.log(i.variantId ?? i.canonicalGameId)' "$PWD/runs/$run_id/artifacts/game-run-identity.json")
```

新摄入项保持 `PENDING`，不能直接参与研究。核对用户指定来源与预期 SHA-256 后，显式完成身份复核；命令会再次计算当前字节哈希、把文件移到 `verified/`，并写入独立复核记录：

```bash
pnpm evidence:review -- \
  --run-root "runs/$run_id" \
  --target-game "$game_id" \
  --workspace "$PWD/runs/$run_id/workspace/game" \
  --id <evidence-id> \
  --expected-sha256 <sha256> \
  --reviewer <reviewer> \
  --basis "与用户指定来源及既有核验记录一致"
```

```bash
pnpm factory audit-reference "$run_id"
```

审计会校验证据用途与 SHA-256、标准 `state/seed/pipeline-plan`、权限清单版本、行为/产品契约、独立 QA 门禁和 `CORE_DEMO` 构建哈希，并写入 `artifacts/reference-quality-audit.json`。`READY_FOR_STANDARD_RESUME` 才能直接续跑；`REQUIRES_NEW_RUN_MIGRATION` 表示必须创建标准新 run，不能在历史目录中补造状态文件。

若 `gameplay-reference` 是录屏，标准流水线会先生成逐帧清单和联系表，再由研究阶段产出关卡重建与 Builder 实现契约。历史 run 或提取器校准可单独执行：

```bash
pnpm factory extract-reference-frames "$run_id" \
  --evidence-id <verified-recording-id> \
  --fps 8
```

输出 `artifacts/reference-frame-manifest.json`，其中绑定目标游戏、绝对工作区、录屏 SHA-256、真实帧时间戳、尺寸和每个派生文件的 SHA-256。来源身份不明、目标/工作区不匹配、文件越界或哈希变化都会阻塞；相同输入重复运行会校验并复用原工件。

### 从网址采集参考游戏

可玩的 H5 页面可以直接采集成本地截图序列。采集只记录资源的 URL、类型、状态码和大小，不下载网页里的图片、音频或脚本。

每次采集都先是草稿，放在 `reference-capture/<id>/`，不会写进证据清单。选定一条之后用 `promote-reference-capture` 入库，入库后状态是 `PENDING`，复核通过前不能进入研究。没入库的草稿可以用 `discard-reference-capture` 删掉；已经入库的不能删。`--clip x,y,宽,高` 只截游戏画面（页面像素坐标）。

需要边看边操作时用分步会话：页面只加载一次，每一步做完动作、录完 `--record-ms` 就返回截图路径，看完再决定下一步。`capture-session-start` 会一直运行到结束，需要放在单独的终端或后台；空闲 20 分钟（`--idle-minutes` 可改）会自动结束。结束后写成一条交互草稿，每一步的标签和帧范围都记在索引的 `steps` 里。

```bash
pnpm factory capture-session-start "$run_id" --url "https://example.com/game" --capture-id explore-1 --fps 8 --width 900 --height 900 --clip 185,16,640,360
pnpm factory capture-session-step "$run_id" --capture-id explore-1 --record-ms 1000 --label 看开局
pnpm factory capture-session-step "$run_id" --capture-id explore-1 --actions-json '[{"type":"hold","atMs":0,"key":"ArrowUp","durationMs":40}]' --record-ms 500 --label 往上一步
pnpm factory capture-session-finish "$run_id" --capture-id explore-1
pnpm factory promote-reference-capture "$run_id" --capture-id explore-1
```

`actions.json` 是动作数组。`key` 是一次点按；需要走路时用 `hold`，它会按住按键直到 `durationMs`。视口默认 390×844，游戏画面比这个宽时用 `--width` 和 `--height`。例如：

```json
[
  { "type": "tap", "atMs": 1000, "x": 0.5, "y": 0.7 },
  { "type": "key", "atMs": 2500, "key": "ArrowLeft" },
  { "type": "hold", "atMs": 3000, "key": "ArrowDown", "durationMs": 800 }
]
```

复核前必须打开 `reference-capture/<id>/frames/frame-00000.png`，并对照索引里的 `finalUrl` 和 `pageTitle`，确认这就是目标游戏。同一次采集如果页面打不开，用同一个 `capture-id` 再跑会重新采集；已经成功的采集会直接复用，换网址则必须换 ID。

```bash
pnpm factory capture-reference-url "$run_id" --url "https://example.com/game" --capture-id first-look --seconds 20 --fps 4 --width 900 --height 900 --actions actions.json
pnpm factory promote-reference-capture "$run_id" --capture-id first-look
pnpm evidence:review -- --run-root "runs/$run_id" --target-game "$game_id" --workspace "$PWD/runs/$run_id/workspace/game" --id web-capture-first-look --expected-sha256 <入库命令输出里的 sha256> --reviewer <你的名字> --basis "落地网址、页面标题、首屏截图与目标游戏一致"
pnpm factory extract-reference-frames "$run_id" --evidence-id web-capture-first-look
```

有多条已复核录像时，研究阶段沿用 `extract-reference-frames --evidence-id` 选定的那一条；从没选过就会停下，要求先选。

### 从游戏包读参考机制

能拿到发布包的 H5 游戏，机制以读代码为准，录像只用来看布局、节奏和手感。第一版支持 Defold（HTML5 版的 Lua 脚本是明文）。`capture-reference-code` 打开网址，等页面请求 `archive_files.json`，按分片下载 `game.arci`、`game.arcd`、`game.projectc`，拼好后解出脚本。草稿放在 `reference-code/<id>/`：`raw/` 是原始文件，`scripts/` 是脚本，`reference-code-package.json` 记录网址、每个文件的 SHA-256 和脚本行数。没找到支持的引擎时草稿是 `BLOCKED`。

代码包入库后用途是 `code-reference`，同样先是 `PENDING`，复核后才可用。然后写一份代码分析 JSON（格式见 `src/schemas/reference-code.ts` 里的 `ReferenceCodeAnalysisSchema`）：每条结论标 `OBSERVED`、`INFERRED` 或 `UNKNOWN`，`OBSERVED` 必须引用脚本路径、哈希和行号；五个行为维度都要覆盖；结论里不能写数字，具体数值只留在引用的代码里，不带进原创实现。`record-reference-code-analysis` 逐条核对引用，通过后写入 `artifacts/reference-code-analysis.json`。

研究阶段发现已复核的代码包时，必须有核对通过的代码分析才会继续，否则停在 `REFERENCE_DEEP_RESEARCH`。有分析时它是机制的主证据。

```bash
pnpm factory capture-reference-code "$run_id" --url "https://example.com/game" --package-id main-build
pnpm factory promote-reference-code "$run_id" --package-id main-build
pnpm evidence:review -- --run-root "runs/$run_id" --target-game "$game_id" --workspace "$PWD/runs/$run_id/workspace/game" --id code-package-main-build --expected-sha256 <入库命令输出里的 sha256> --reviewer <你的名字> --basis "构建地址、页面标题和工程名与目标游戏一致"
pnpm factory record-reference-code-analysis "$run_id" code-analysis.json
```

证据清单的独立字节校验需要显式声明目标，示例：

```bash
pnpm evidence:check -- \
  --manifest "runs/$run_id/reference-evidence/manifest.json" \
  --target-game "$game_id" \
  --workspace "$PWD/runs/$run_id/workspace/game"
```

```bash
pnpm factory approve-reference "$run_id" \
  --decision APPROVE \
  --notes "机制关系确认；所有表现层与数值保持原创"
FACTORY_MODE=mock pnpm factory resume "$run_id"
```

参考适配只有 `APPROVE` 才能进入蓝图和构建；显式指定 `designMode: reference_reskin` 时，缺少 `referenceMechanics` 的 seed 会校验失败。

Builder 首次只构建一个核心切片，内容扩展和非必要 HUD 要等候。录屏契约存在时，Builder 必须实现全部语义对象、生命周期、检查点、粗粒度摆放、空间关系、动作顺序、镜头、终态和重玩，并暴露只读运行时探针。普通 QA、调试注入或确定性截图采集不能结束参考预览；独立 QA 必须通过正常指针输入生成候选轨迹，再与来源契约逐项比较。比较失败会进入正式 FIX → QA 复测；每次新尝试都需要不同且有证据支持的修复假设，并遵守配置的成本、时间、Token 和平台上限。每个行为检查 × 目标视口仍必须有同构建哈希的截图和独立感知结论；通过后停在 `WAITING_FOR_HUMAN_PLAYTEST`，只有真人接受该核心切片才允许后续扩展。
见[参考玩法质量优化与小李飞刀复盘](docs/factory-reference-quality-optimization-2026-09-08.md)。

## 兼容的 Prototype Tournament

普通原创 seed 默认使用 `designMode: prototype_tournament`。`factory route` 与 `factory new` 使用同一份计划策略；可在两个命令中传入 `--rigor standard` 或 `--rigor full`，`minimal` 仅适用于参考预览。创建 run 时冻结计划，后续恢复沿用该计划。

待人工审阅时，先运行 `pnpm factory status <run-id>` 或 `pnpm factory runs`，再执行返回的 `pnpm factory inspect <run-id>`。`inspect` 展示对应待审 JSON 和材料路径，缺失材料会明确标记；状态中的决策命令是带占位符的模板，需要审阅后再填写。`factory-eval` 只评估入口、路由和门禁，报告中的 `productQuality: NOT_ASSESSED` 表示尚未验证游戏品质。

```bash
run_id=$(FACTORY_MODE=mock pnpm --silent factory new examples/seeds/prototype-theme.yaml)
FACTORY_MODE=mock pnpm factory run "$run_id"
```

Run 会停在 `WAITING_FOR_PROTOTYPE_APPROVAL`。查看 `runs/<run-id>/human/prototype-review.json` 可得到三个玩法、AI 推荐、理由和启动命令。在三个终端分别运行：

```bash
pnpm factory preview "$run_id" prototype-a
pnpm factory preview "$run_id" prototype-b
pnpm factory preview "$run_id" prototype-c
```

人类可提交 `APPROVE / REJECT / PREFER_A / PREFER_B / PREFER_C / REVISE`：

```bash
pnpm factory approve-prototype "$run_id" --decision APPROVE
FACTORY_MODE=mock pnpm factory resume "$run_id"
```

`APPROVE` 或 `PREFER_*` 才会开始 `IAA_REVIEW`。`NONE` 是合法 Winner 结果；首批为 `NONE` 时自动再生成一批，第二批仍为 `NONE` 则以 `NO_PROTOTYPE_WINNER` 正常结束，不进入完整制作。

## 小游戏工厂回归 Fixture

`examples/seeds/ghost-night-market.yaml` 已标记为 `status: DESIGN_REJECTED` 和 `purpose: regression_fixture`。现有 `idle-shop-v1` 游戏与测试保留，仅验证构建、QA、存档、自动修复和发布能力，不再作为 Game Design 成功样本，也不再向其添加玩法。技术回归仍可运行：

```bash
FACTORY_MODE=mock ART_PROVIDER=mock pnpm factory demo
```

## codex-account 模式

复制配置示例，或直接设置环境变量：

```bash
cp .env.example .env
export FACTORY_MODE=codex-account
export ART_PROVIDER=codex-imagegen
```

该模式不会检查或要求 `OPENAI_API_KEY`、`CODEX_API_KEY`、`OPENAI_TEXT_MODEL` 或 `OPENAI_IMAGE_MODEL`，也不会静默回退到 Mock。参考适配模式中，现有岗位只做开源基础设施调研、IAA 复核、技术落地、美术和 QA，不参与玩法发散；没有新增 Agent 数量。

创建并启动第一款真实游戏：

```bash
run_id=$(FACTORY_MODE=codex-account ART_PROVIDER=codex-imagegen pnpm --silent factory new examples/seeds/relic-revival-workshop.yaml)
FACTORY_MODE=codex-account ART_PROVIDER=codex-imagegen pnpm factory run "$run_id"
pnpm factory approve-reference "$run_id" --decision APPROVE
FACTORY_MODE=codex-account ART_PROVIDER=codex-imagegen pnpm factory resume "$run_id"
```

文本阶段会使用 `--json`、`--output-schema` 和 `-o`。Producer、ArtDirector、StyleLock 在 run 根目录以 `read-only` 运行；Builder 只在 `runs/<run-id>/workspace/game` 以 `workspace-write` 运行。Builder 的 thread ID 写入 `state.json` 和 build report；Fixer 使用 `codex exec resume <thread-id>`，没有固定自动修复轮数上限；保留每轮证据，并在明确的用户或配置上限、外部硬约束、或没有可行的新假设时停止。

Builder 和 Fixer 的超时预算独立配置：`CODEX_BUILD_TIMEOUT_MS` 默认
`900000`（15 分钟），`CODEX_FIX_TIMEOUT_MS` 默认 `600000`（10 分钟）。文本岗位仍使用
`CODEX_EXEC_TIMEOUT_MS`（默认 5 分钟）。Builder 完成后，工厂会在本地再次验证生成项目，依次运行
`pnpm test`、`pnpm typecheck` 和生产构建；成功结果写入
`artifacts/build-report.json`，其中 `verification` 会包含 `test:passed` 和
`typecheck:passed`。

如果 Builder 的 Codex turn 已经完成、但工厂本地验证出现误报或暂时失败，不要重新消费一次
Codex 调用。确认 `state.json` 的 `FULL_BUILD` 为 `failed`，且
`logs/codex/BUILD.attempt-1.stdout.jsonl` 同时包含 `thread.started` 和
`turn.completed`，没有 `turn.failed`，并且记录了 Builder thread ID 后，可运行：

```bash
FACTORY_MODE=codex-account pnpm factory verify-build <run-id>
```

`verify-build` 只复用已经保存的完成态 JSONL 和现有 `workspace/game`，重新执行本地
`test`、`typecheck`、生产构建并写回 `build-report.json`，不会调用 Codex 或创建新的 thread。
如果 JSONL 没有证明 turn 已完成、缺少 thread ID，或 FULL_BUILD 并非失败，命令会拒绝继续；此时应按
失败原因修正后使用受控的 `retry`。

### 图片人工接力

当前 Codex CLI 支持向非交互任务输入图片，但没有稳定、文档化的非交互图片输出到指定路径契约。因此 `codex-account` 会停在：

```text
WAITING_FOR_CODEX_IMAGEGEN
```

四方向任务位于：

```text
runs/<run-id>/art-review/art-imagegen-task.md
```

把其中四段各自包含 `$imagegen` 的指令粘贴到当前 Codex 对话执行，并将 PNG 保存到任务指定的绝对目录。工厂不会生成 SVG、色块或 Mock 图冒充成功。四张 `direction_a.png` 至 `direction_d.png` 都通过 PNG 文件检查后，恢复：

```bash
FACTORY_MODE=codex-account ART_PROVIDER=codex-imagegen pnpm factory resume "$run_id"
open "runs/$run_id/art-review/index.html"
```

然后审批并继续：

```bash
pnpm factory approve "$run_id" \
  --direction direction_b \
  --notes "保留人物比例和配色，降低饱和度，简化背景，不要太幼儿化"

FACTORY_MODE=codex-account ART_PROVIDER=codex-imagegen pnpm factory resume "$run_id"
```

审批文件经过 Zod 验证，默认不覆盖已有文件；确需替换时加 `--force`。StyleLock 由新的独立只读 Codex 线程生成。

正式素材使用相同机制：流水线会写 `art-review/asset-imagegen-task.md` 并再次停在 `WAITING_FOR_CODEX_IMAGEGEN`。所有真实 PNG 存在后再次 `resume`，Builder、Playwright QA、必要时 Fixer、以及本地确定性 Release 才会继续。

## 限制与证据

原型待审状态通过 `inspect` 展示本批次的构建报告、独立试玩比较、推荐结果以及文件哈希快照。
正向批准和恢复执行都会再次核对快照；候选文件改变或证据缺失时保持待审。`REJECT`、`REVISE`
仍可提交。显式 `qaMode=stub` 的测试流程会标记 `synthetic: true`，并始终保留
`usableForProductAcceptance: false`，无论使用哪种模型提供方。

`COMPLETED` 表示执行流程结束。只有当前构建、自然输入轨迹、运行时报告和冻结候选包的证据一致，
状态才显示 `CANDIDATE_READY`；缺少这些证据的实现保留 `IMPLEMENTATION_READY`。
控制面回归与 mock 流程不能代替真实游戏的自然输入、可感知体验和三个目标平台验收。


- `CODEX_EXEC_TIMEOUT_MS` 控制单次 `codex exec` 超时，默认 300 秒。
- `CODEX_BUILD_TIMEOUT_MS` 控制真实 Builder 的 `workspace-write` 调用超时，默认 900 秒；
  `CODEX_FIX_TIMEOUT_MS` 控制 Fixer 的恢复调用超时，默认 600 秒。
- `CODEX_EXEC_MAX_RETRIES` 只能取 0 或 1；每个 Agent stage 的单次 provider 调用最多重试一次（总计两次 Codex 调用），这不是 FIX 阶段的修复轮数。
- Fixer 只能处理 `qa-report.json` 明确列出的问题；每次修复后必须重建并经独立 Playwright QA 复测，失败证据和尝试次数持续保留。自动 FIX 没有固定轮数上限，但必须遵守用户或配置的成本、时间、Token、平台上限，且不能在没有新修复假设时反复重建。
- Codex stdout、stderr、JSONL 事件、最终消息与 Schema 保存在 `runs/<run-id>/logs/codex/`。
- 每 stage 的调用次数和 token usage 记录在 `state.json` 及 `artifacts/provider-usage.json`。
- 认证材料不会写入日志或 Artifact；工厂从不读取 `~/.codex/auth.json`。
- 方向预览固定四张；缺图时等待，不继续消费后续阶段。

Builder 的 build report 是本地可复核证据，不是 Codex 最终消息的声明：`verification` 至少记录
契约检查、版本化存档、`test:passed`、`typecheck:passed`，并在这些检查和 Vite 生产构建都成功后
才允许进入 QA。若失败发生在本地验证而已完成的 Builder JSONL 已保存，优先使用
`pnpm factory verify-build <run-id>`，避免重复调用模型。

QA 是现有真实 Playwright 自动测试，不获得修改游戏源码的权限。Release 仍是现有本地只读打包与 SHA-256 清单生成，不需要模型。旧 OpenAI API Provider 源码仅作为未来可选扩展保留，不是 `codex-account` 的运行依赖。

验证仓库：

```bash
pnpm lint
pnpm typecheck
pnpm test
FACTORY_MODE=mock ART_PROVIDER=mock pnpm factory demo
pnpm factory doctor
```
