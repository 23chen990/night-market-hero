# AI 小游戏工厂：MVP 架构

## 产品边界

本仓库交付的是可重复生产轻量小游戏的本地流水线，不是一款固定游戏。MVP 只实现一个
Manager Orchestrator、文件状态存储、Mock/Real Provider 边界、一个 Phaser web-lite 模板和
一个人工美术审批门。没有数据库、队列、容器、后台、账号、支付或发行渠道。

## 确定性状态机

```text
CREATED
  -> BLUEPRINT
  -> ART_DIRECTIONS
  -> WAITING_FOR_ART_APPROVAL
  -> STYLE_LOCK
  -> ASSETS
  -> BUILD
  -> QA
     -> FIX -> QA (最多两轮)
  -> RELEASE
  -> COMPLETED

任一执行阶段 -> FAILED（保留可重试的阶段、错误与证据）
```

`runs/<run-id>/state.json` 是唯一运行状态真相。每个 stage 保存状态、时间、尝试次数、输入、
输出、错误和机器可检查的 evidence。Artifact 先通过 Zod 校验，再用临时文件加 rename 原子写入。
普通恢复按 `state.json` 跳过已完成 stage；重复 `resume` 不重写状态或发行产物。失败 stage 的
`retry` 保留错误历史并递增 attempts。发行目录通过 release manifest 中的 SHA-256 做完整性核验。

人工门不是错误：生成四个方向和静态 review 页面后，状态为
`WAITING_FOR_ART_APPROVAL`。`resume` 只在 `human/art-approval.yaml` 存在且有效时继续。

## 组件

- `Orchestrator`：唯一调度者；按固定顺序调用岗位，不允许岗位自由聊天。
- `ProducerAgent / ArtDirectorAgent / StyleLockAgent / AssetProducerAgent / BuilderAgent / QAAgent / FixerAgent / ReleaseAgent`：只接受和
  产出 Schema 验证的 JSON Artifact。只有 Builder/Fixer 可以写 `workspace/game`。
- `AgentProvider / CodexProvider / ImageProvider / RuntimeProvider / QAProvider`：外部能力边界。
  默认 Mock；真实模式只由环境变量启用。
- `WebLiteRuntimeAdapter`：从版本化模板创建 Phaser + TypeScript + Vite 项目、导入配置、启动预览、
  构建 Web。MVP 没有其他运行时适配器。
- `FileRunStore`：创建 run、原子保存状态和 Artifact、记录 JSONL 日志。
- `factory` CLI：薄入口，不复制业务规则。

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

## 失败、QA 与发行

QA 启动已构建 Web 预览，Playwright 优先调用测试接口验证经营闭环，再验证 Canvas 可见、无
console error，并保存截图和日志。失败报告成为 Fixer 的唯一修复范围；最多两轮。超过上限则
`FAILED`，不发布。Release 复制 Web 构建及报告到 `release-candidate/`，并写文件哈希清单。

审批 YAML 无效也属于 `STYLE_LOCK` stage 的受控失败：state 顶层进入 `FAILED`，stage 保留错误，
修正审批后可用 `retry <run-id> STYLE_LOCK` 恢复。

## 安全与可替换性

密钥只从环境变量读取。Mock 模式不联网且可完整 E2E。真实 Provider 的调用封装在 Provider
内部，返回值仍须 Schema 校验。模板、Adapter 和 Provider 都可以独立替换，不改变状态机格式。
