# Agent 工厂复盘（2026-09-01）

> 本文只做诊断和方向建议，不含任何代码改动。所有结论均附可复现的证据来源。
> 采集时间：2026-09-01 13:00–14:00（UTC+8），仓库 `/Users/kker/Documents/ChatGPT/妖怪夜市`。

## 0. 一句话结论

**流水线目前跑不通，需要修复；但绝大多数门禁本身是健康的，不该拆。**

真正的病因是：**质量门禁的设计速度，超过了证据供给能力的建设速度。**
门禁要求 QA provider 提供运行时证据，而这个证据生产端从未被实现，
于是所有 run 都退到 fallback 路径；叠加环境缺失（pnpm 未安装）与两处标准不一致，
最终表现为连续失败。

> **给后续窗口的重要提醒**：不要把 `runtime-product` 门禁误读为"硬编码失败 + 绕过暗道"。
> 它是 fail-closed 设计（缺证据即失败）加上一个带 6 条阻塞条件的确定性投影，
> 并配有真实文件系统反伪造校验。**这道门禁不应被删除或放宽。** 详见第 2 节。

---

## 1. 运行数据：新门禁引入后成功率为 0

`runs/` 下 27 个目录，其中 22 个有 `state.json`：

- `completed` 10
- `failed` 5
- `waiting` 3
- `pending` 2
- `running` 2（实为中途崩溃残留）

按 provider 模式拆分：

- `mock` 15 次：8 completed、4 failed、2 running、1 waiting
- `codex-account`（真实模型）7 次：2 次 completed，其中 1 次是 action 实验分支
  （`ACTION_EXPERIMENT_APPROVED`），真正走完主流程到 `COMPLETED` 的只有
  `20260830033859-67260d1f` 一次

关键事实：**10 次 `completed` 全部发生在 runtime-product 门禁引入之前。**
抽查 `20260829150744`、`20260830073354`、`20260830130002-action` 三个 completed run 的 artifacts 目录，
`runtime-product-gates.json` 这个文件根本不存在。

最近一批 6 次运行（`fc9bfb6c`，UTC+8 今日 06:22–06:42）全军覆没：

| run | 结果 | 停在 |
|---|---|---|
| 20260831222245-fc9bfb6c | failed | FAILED |
| 20260831222905-fc9bfb6c | failed | FAILED |
| 20260831223051-fc9bfb6c | failed | FAILED |
| 20260831223409-fc9bfb6c | failed | FAILED |
| 20260831224027-fc9bfb6c | running（崩溃残留） | FIX |
| 20260831224209-fc9bfb6c | running（崩溃残留） | FIX |

6 次全部死在同一个位置，说明这是确定性缺陷，不是偶发。

---

## 2. runtime-product 门禁：设计是健康的，缺的是证据供给端

### 2.1 这道门禁做了什么（不要误读）

`QAAgent.run`（`src/agents/index.ts:297`）在每次 QA 结束时写入一份 `passed: false` 的门禁产物。
**这是 fail-closed 默认值，不是"硬编码失败"。** 缺少证据即判定失败，是正确的安全姿态。

当 QA 产出了完整的自然试玩轨迹时，`src/factory.ts:2365` 起会调用
`deriveRuntimeProductGate` 做一次**确定性投影**。这不是绕过，它带 6 条独立阻塞条件
（`src/core/runtime-product-gates.ts:138-181`）：

1. natural flow 必须通过 `NaturalFlowEvidenceSchema` 校验
2. 必须 `startedFromReset`（从重置开始，不能中途接管）
3. 必须存在**真实发生变化**的状态转移（`transition.changed`）
4. 必须有 terminal 或 settlement 完成态
5. 必须观察到 replay（重试）
6. `forbiddenOperations` 必须为空——**不许用 test API 直接改状态冒充试玩**

任何一条不满足即 `passed: false`。代码注释明确写着：
*"it never fabricates a state transition or a browser artifact"*。

`RuntimeProductGateSchema.superRefine` 在 `passed: true` 时还追加要求：
journey 必须含启动、`coreLoop` 非空且其内容必须出现在 journey 中、
terminal 必须含真实终局标记、replay 必须含重试动作、
`legacyBehavior` 不能是 `STILL_DEFAULT_PATH`、`browserEvidence` 不能为空。

`verifyRuntimeWiredFiles`（同文件 `:102-126`）再做一层真实文件系统反伪造校验：
声明的文件必须存在、必须是真实文件、不能是 symlink、
realpath 解析后不能逃出 run root。

**结论：这是认真的反伪造设计，删除或放宽它会直接降低产品质量。**

### 2.2 真正的问题

对 `src/providers/`（`mock.ts`、`real.ts`、`codex-account.ts`、`codex-cli.ts`、`runtime-qa.ts`）
和 `src/qa/`（含 `playwright-qa.ts`、`action-playwright-qa.ts`）搜索
`runtimeProduct` / `runtimeWiredFiles` / `legacyBehavior` / `browserEvidence`：

**匹配数为 0。**

全仓库只有 6 个文件引用这些字段，全部在控制面和 schema 层：
`factory.ts`、`core/release.ts`、`core/runtime-product-gates.ts`、`core/factory-constitution.ts`、
`schemas/index.ts`、`agents/index.ts`。

即：门禁设计时假定"QA provider 会产出运行时证据"，但**这个生产端从未被实现**。
结果是主证据路径永远为空，所有 run 都只能依赖 fallback 投影。
一个本应是兜底的路径变成了唯一路径——这是设计与实现之间的缺口，不是门禁本身的缺陷。

**正确修法：补上 QA provider 的证据产出，让门禁走主路径。不是删门禁。**

---

## 3. 证据台账与真实校验结果没有数据依赖

### 3.1 现象

同一次 `FULL_BUILD`，两份记录对不上：

| 来源 | 内容 |
|---|---|
| `artifacts/build-report.json` 的 `verification`（真实结果） | `["contract:test-api-7", "save:versioned"]` |
| `state.json` 里 `stages.FULL_BUILD.evidence`（台账记录） | `["build:tests", "build:typecheck", "build:dist", "vite:build-success", ...]` |

根因：`src/factory.ts` 中 `FULL_BUILD` 的 `complete()` 调用里，evidence 是一串
**硬编码字符串字面量**，与 `result.report.verification` 没有任何数据依赖：

```ts
await complete(state, record, [...],
  ['build:tests', 'build:typecheck', 'build:dist', 'vite:build-success', `build-hash:${buildHash}`, ...]);
```

### 3.2 影响范围（重要：不要夸大）

查证 `verificationMode` 的全部来源：

- `real.ts:247,258` 与 `codex-account.ts:197,244,290,303`：`build` / `fix` 均返回 `'full'`
  → `requireScripts: true` → `pnpm test` 与 `pnpm typecheck` **真的会执行** → evidence 准确
- `mock.ts:124,125`：`build` / `fix` 返回 `'contract'`
  → `verifyProject` 在 `src/adapters/web-lite.ts:93` 提前 return → 检查不执行，但 evidence 仍写 `build:tests`

**所以：真实模型模式下的证据是可信的，问题只出现在 mock 模式。**
那 2 次 `codex-account` 的 completed 记录不需要重估；需要打折的是 8 次 mock run，
而 mock run 本就是仿真，不应被当作质量基线。

这仍然是应修缺陷——台账绝不该声称未执行的检查——但严重性属于中等，不是系统性失真。

**修法**：让 evidence 只能从 `report.verification` 派生，禁止硬编码字面量。
这个改动只会让台账更严格，不会更宽松。

---

## 4. 本次崩溃的直接原因：两处标准不一致 + 失败回路缺失

```
Error: Builder verification requires package scripts: test, typecheck; missing test, typecheck
    at WebLiteRuntimeAdapter.verifyProject (src/adapters/web-lite.ts:95:42)
    at async FixerAgent.run (src/agents/index.ts:290:26)
    at async executePipeline (src/factory.ts:1725:23)
```

三个叠加缺陷：

1. **标准不一致**：`FixerAgent.run` 硬编码 `requireScripts: true`，而 `BuilderAgent` 按
   `verificationMode` 传值（mock 下为 `false`）。同一个 workspace，Builder 放行、Fixer 拒收。
   **修复方向必须统一到严格侧**（都要求脚本存在并执行）；统一到宽松侧就是降质量。
2. **模板缺脚本**：生成的 `workspace/game/package.json` 只有 `dev` / `build`。
   模板补 `test` / `typecheck` + vitest 的修复**目前仍是未提交状态**
   （见 `git diff templates/web-lite/idle-shop-v1/package.json`）。
3. **失败回路缺失**：`FixerAgent` 直接 `throw` 原生 Error，没有走宪章第 7 条要求的
   "失败回到产生错误 Artifact 的最早责任阶段"，整个 run 当场 `FAILED`，
   `state.json` 顶层甚至不记录失败原因（只有 `stage: "FAILED"` / `status: "failed"`，
   错误信息埋在 `stages.QA.errors` 里）。
   **修复方向必须是"记录 + 回到责任阶段 + 计入重试上限"**，不能变成吞掉错误继续跑。

---

## 5. pnpm 未安装，宪章要求的验证链在本机从未执行

- `which pnpm` → **not found**
- `package.json` 声明 `"packageManager": "pnpm@11.19.0"`
- `corepack` 存在于 `/usr/local/bin/corepack`，但未启用 pnpm shim
- Node v24.14.0

而 `src/adapters/web-lite.ts` 的 `verifyProject` / `verifyFormalProject` 及构建流程，
全部靠 shell 调用 `pnpm test` / `pnpm typecheck` / `pnpm build`。

这意味着：**真实模型模式下 `requireScripts: true` 走到的那条严格校验路径，
在这台机器上根本无法执行。**

后果（`npx vitest run` 实测）：

- **13 个测试失败 / 5 个测试文件失败**（672 passed / 685 total）
- 其中 5 个用例各自 hang 满 60 秒才超时：60007ms、60005ms、60021ms、60022ms、60020ms
- 整个测试套件耗时 **183 秒**
- 失败原因统一为 `Error: spawn pnpm ENOENT`

失败清单：

- `tests/integration/cli.test.ts`（7 个用例）
- `tests/integration/codex-account-orchestrator.test.ts`（3 个）
- `tests/integration/approval.test.ts`（1 个）
- `tests/unit/spatial-shop-runtime.test.ts`（1 个）
- `tests/unit/web-lite-runtime.test.ts`（1 个，正是 "supports full Builder verification on the idle production template"）

注：`npx tsc --noEmit` 通过（exit 0），类型层是健康的。问题在运行时环境与执行链。

---

## 6. 复杂度与产出倒挂（观察，非立即行动项）

| 指标 | 数值 |
|---|---|
| 状态机阶段数 | 77 |
| 单次 run 产出的 JSON artifact | 64 |
| 工厂源码 | 163 个文件 / 22,862 行 |
| 测试代码 | 12,302 行 |
| `src/factory.ts` | 3,612 行 / 316 KB 单文件 |
| `src/core/` | 74 个文件 |
| `src/schemas/` | 73 个文件 |
| **实际产出的游戏** | **483 行**（`20260830033859` 的 `workspace/game/src/`） |

### 代码可读性已被牺牲

| 文件 | 行数 | >300 字符的行 | >800 字符的行 | 最长行 |
|---|---|---|---|---|
| `src/factory.ts` | 3,612 | 80 | 10 | **4,116** |
| `src/core/stage-contracts.ts` | 677 | 60 | 45 | 2,560 |
| `src/agents/index.ts` | 377 | 18 | 3 | 2,591 |

`stage-contracts.ts` 有 45 行超过 800 字符——单行塞进完整的阶段契约定义。
这是代码正在被压缩以压低行数的信号。后果是任何人（包括 agent 自己）
都难以在这些文件里做安全的局部修改，也直接提高了引入回归的概率。

> **注意**：本节是观察，不是"砍阶段"的授权。
> 阶段数量是否过多，必须**逐条审计每个阶段的实际作用**后再判断，
> 不能凭体量拍数字。在没有完成审计前，不要删除任何阶段或门禁。

### 版本控制状态

- 仓库只有 **1 个 commit**：`99d4eb9 feat: bootstrap mock AI game factory MVP`
- 未提交改动：**33 个文件，+7,548 / -249**
- 另有 6 个未跟踪的新文档

修复与问题混在同一坨未提交的 diff 里，无法二分定位，也无法回滚到任何已知良好状态。

---

## 7. 根因

不是"遇到问题就加规则"，而是更具体的一件事：

> **门禁的设计速度，超过了证据供给能力的建设速度。**

`runtime-product` 门禁定义了严格且合理的验收标准，但它依赖的
"QA provider 产出运行时证据"这一步从未落地。门禁于是长期依靠兜底投影运行，
而兜底投影又依赖自然试玩轨迹的完整性——一旦上游任何环节（环境、模板、Fixer）出问题，
整条链就断在 QA/FIX 阶段。

叠加因素：

- 环境缺失（pnpm）导致严格校验路径本身不可执行
- Builder 与 Fixer 校验标准不一致，制造出必然崩溃点
- 失败回路缺失，任何一次异常直接终结整个 run
- 代码高度压缩，使得上述问题难以被发现和安全修复

这四点共同作用，才是连续 6 次失败的完整解释。

---

## 8. 建议方向

### 8.1 首要原则：不允许通过放宽标准来换取通过率

**最容易让工厂质量变差的做法，就是把"让流水线跑通"当成目标。**
达成该目标最快的路径永远是放宽门禁。

因此本次改造的验收标准定为：

> **每一条 evidence 都能追溯到一次真实执行的检查，
> 且没有任何门禁的判定条件被放宽。**
>
> 即使改造完成后流水线仍然跑不通，也算达标——
> 跑不通但记录诚实，优于跑通但记录不实。

### 8.2 保护措施：棘轮测试（在动任何门禁之前先做）

快照当前所有质量门禁的判定条件，建立一条回归测试：
**任何改动如果让某道门禁从"会拒绝某输入"变成"会接受该输入"，测试必须失败，
并要求显式的豁免签名。**

这样任何标准放宽都必须是有意识、留痕的决定，而不是重构的副产品。
有了这层保护，后续无论由谁（人或 agent）修改本仓库，都很难悄悄把标准调松。

### 8.3 执行顺序

**第 0 步 · 建立可回滚点。**
把当前 +7,548 行的未提交改动分类提交，至少拆成"环境与模板修复"、
"新门禁"、"文档"三组。没有回滚点的重构等于第二次事故。

**第 1 步 · 修环境（纯增益）。**
启用 pnpm（`corepack enable pnpm`）或统一改用 npm，二选一并写进 README 前置条件。
让 `verifyProject` 在找不到包管理器时**立即失败并给出明确信息**，而不是 hang 60 秒。
提交模板的 `test` / `typecheck` 脚本修复。

> 预期副作用：修好之后，短期内失败可能变多。这不是变差，
> 而是原本因环境缺失而从未执行的检查终于开始运行，把隐藏问题暴露出来。

**第 2 步 · 建棘轮测试。** 见 8.2。此步之后才允许触碰任何门禁相关代码。

**第 3 步 · 修证据派生（纯增益）。**
evidence 只能从 `report.verification` 派生，禁止硬编码字面量。
补一条元测试：断言 `build-report.json.verification` 与
`state.json.stages.*.evidence` 在"声称执行过的检查"上一致。

**第 4 步 · 修两处不一致（方向必须钉死）。**
统一 Builder 与 Fixer 的 `requireScripts` **到严格侧**；
Fixer 改走失败回路（记录 + 回到责任阶段 + 计入重试上限），并在 `state.json` 顶层记录失败原因。

**第 5 步 · 补 QA provider 的运行时证据产出。**
让 `runtime-product` 门禁走主证据路径，而非长期依赖 fallback 投影。这是本次改造的核心目标。

**第 6 步（可选，需先审计）· 降低复杂度。**
拆分 `src/factory.ts`，加单行长度 lint 规则（建议 200 字符）。
阶段与门禁的精简**必须先完成逐条审计**，在此之前不做任何删除。

---

## 9. 待办清单（按执行顺序）

- [ ] 拆分并提交当前 7,548 行未提交改动，建立回滚点
- [ ] 启用 pnpm 或切换 npm，写入 README 前置条件
- [ ] 包管理器缺失时快速失败，消除 60 秒 hang
- [ ] 提交模板 test/typecheck 脚本修复
- [ ] **建立门禁棘轮测试**（此步之后才允许触碰门禁代码）
- [ ] evidence 只能由真实校验结果派生 + 元测试
- [ ] 统一 Builder / Fixer 的 requireScripts 到严格侧
- [ ] Fixer 失败走宪章失败回路，不直接 throw
- [ ] `state.json` 顶层记录失败原因
- [ ] 补 QA provider 的 runtime 证据产出，让门禁走主路径
- [ ] 拆分 `src/factory.ts` + 单行长度 lint 规则
- [ ] 逐阶段审计（77 个阶段各自的实际作用），审计完成前不删除任何阶段

### 明确不做

- ~~删除 runtime-product 门禁~~ —— 该门禁是健康的反伪造设计，删除会降低质量
- ~~把 77 阶段砍到 15–20~~ —— 未经逐条审计，不得凭体量拍数字删除阶段
- ~~以"让流水线跑通"作为验收标准~~ —— 该目标会诱导放宽门禁

---

## 附：证据复现命令

```bash
cd /Users/kker/Documents/ChatGPT/妖怪夜市

# 各 run 的 provider 模式与结果
for d in runs/*/state.json; do node -e "const j=require('./$d');console.log([j.runId,j.providerMode,j.status,j.stage].join(' | '))"; done

# 证据未派生：真实校验 vs 台账记录（mock 模式下不一致）
node -pe "JSON.stringify(require('./runs/20260831223409-fc9bfb6c/artifacts/build-report.json').verification)"
node -pe "JSON.stringify(require('./runs/20260831223409-fc9bfb6c/state.json').stages.FULL_BUILD.evidence)"

# 门禁缺少证据生产端
grep -rn "runtimeProduct\|runtimeWiredFiles" src/providers/ src/qa/    # 预期 0 匹配

# 各 provider 的 verificationMode（确认真实模式为 full）
grep -rn "verificationMode" src/providers/

# 环境
which pnpm            # 预期 not found
npx tsc --noEmit      # 预期通过
npx vitest run        # 预期 13 failed / 183s

# 超长行
awk '{if(length>m)m=length}END{print m}' src/factory.ts   # 预期 4116
```
