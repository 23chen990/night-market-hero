# 玩家结果验收工作流

工厂的 QA 不能只证明代码规则正确，还必须证明玩家在正常流程中看见并感受到结果。每次功能变更或关卡扩展都要生成 `PlayerAcceptanceGateSchema` 兼容的验收对象。

五个维度必须分别记录通过状态和机器可定位的证据：

1. `core`：物理、状态机、碰撞、存档等核心规则。
2. `normalFlow`：从重置开始的真实流程，不得只调用测试场景或 `setState`。
3. `visualEvidence`：触发前、触发中、解决后的截图或视频帧，并记录 console/page error。
4. `levelDifference`：地图长度、关键坐标、障碍节奏或路线差异的结构化比较和截图。
5. `humanPlaytest`：人工打开最终构建产物后的短试玩记录，包含输入方式、观察、失败点和结论。

只有五项全部为 `passed: true` 时，`releaseReady` 才能为 true；schema 会拒绝不一致的手填结果。测试场景证据可以补充核心维度，但不能替代正常流程证据。

## 操作可兑现性（通用契约）

涉及“玩家看到反馈后立即操作”的功能，额外生成 `ActionRealizabilitySchema` 对象。该契约不预设玩法、对象或数值，只要求 Builder 为每个动作声明：

- `actionId`：动作或交互的稳定标识；
- `feedbackSignal`：玩家看到的可操作反馈；
- `successCondition`：动作成功时应进入的可玩状态；
- `constraints`：由游戏自行选择的可测量约束（例如响应时间、距离、资源或风险上限）；
- `recovery`：失败是否必须提供补救，以及补救描述；
- `repetition`：重复次数和最低成功次数；
- `evidence`：流程追踪、截图或录像证据。

工厂只验证“反馈 → 动作 → 成功/补救”的一致性、约束可测量、重复统计满足声明，不写死挂点、绳长、跳跃、卡牌或任何特定机制。若某个动作的反馈与实际候选不一致，或反馈成立却把玩家送入不可恢复状态，应阻止进入 RELEASE。

建议 QA 顺序：先跑核心测试，再跑正常流程和视觉采样，随后做关卡差异比较，最后进行人工试玩。任一维度失败都回到 FIX，不进入 RELEASE。

Builder 的构建报告只表示 `IMPLEMENTATION_READY`，并明确列出尚未完成的体验门禁；它不能被当作候选版本或发布版本。三种状态必须分开记录：

- `implementationReady`：Builder 的测试、类型检查和构建通过。
- `candidateReady`：再加上正常流程、视觉证据、关卡差异全部通过。
- `releaseReady`：五项全部通过，且人工试玩证据可追溯。

正式环境调用 `ReleaseAgent.run(..., { enforceAcceptance: true })`（工厂也支持 `FACTORY_ENFORCE_ACCEPTANCE=1`）；缺少 acceptance 对象时直接阻止打包。Mock/历史兼容运行可关闭该选项，但不能据此宣称产品已完成。

## 人工审批次数与例外门

默认人工只安排三次 scheduled session，顺序固定为 `GO_NO_GO`、`CORE_DEMO`、`FINAL_RELEASE`。`ORIGINALITY_REVIEW`、`CERTIFICATION` 和（启用时）`DIFFERENTIATION` 不是第四次会审：它们分别产出原创性声明、合规材料和差异化证据，并作为 `GO_NO_GO` 的条件/异步材料归档。若其中任何一项失败，工厂会暂停在业务预审并列出待补证据；不会自动新增人工 session，也不会把 Builder/Fixer 的自证当作批准。

只有真正触发例外时才需要一次针对性裁决（例如来源不明、差异化不足或平台资料缺失）。这类记录必须标记为 `conditional` 或 `async`，`countsTowardScheduledSession` 必须为 `false`；三次 scheduled 记录的数量和顺序不可改变。
