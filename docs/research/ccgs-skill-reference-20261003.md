# CCGS Skill 参考索引

这份索引把 [Claude Code Game Studios](https://github.com/Donchitos/Claude-Code-Game-Studios) 登记为共享工厂的流程参考。机器可校验的许可证、固定版本、风险和复用边界见 [`ccgs-skill-reference-20261003.json`](./ccgs-skill-reference-20261003.json)。当前绑定版本是 `v1.1.2`，commit `b21fa0f7f289fc3e726cf36fb12b9bc1e7a51e4d`。

## 允许借鉴的内容

| CCGS 参考 | 我们的落点 | 使用边界 |
| --- | --- | --- |
| `modes.rigor` 的 `minimal / standard / full` | 请求路由和用户可见的快线、核心切片、发布线 | 只借鉴模式分层；不把更多文档或 Agent 数量当作质量指标 |
| `/start` 的单一前门 | `src/core/request-router.ts` 和后续三条入口：原创、参考改编、已有 Demo 产品化 | 普通“做个小游戏”不能自动进入参考复刻；参考意图必须明确 |
| `CCGS Skill Testing Framework/` | `factory-eval`、技能契约和阶段回归测试 | 参考测试方法；不复制外部脚本或把其结果当作游戏质量证明 |
| `/playtest-report` 与 run-and-observe 约束 | `.agents/skills/game-playtest/SKILL.md`、自然流程 QA 和 runtime-product gate | 必须使用玩家可见、自然输入、可重玩的证据 |
| `/gate-check` 与阶段可读状态 | `runs/<run-id>/state.json`、readiness、等待原因和恢复命令 | 内部 stage 可以复杂，用户可见状态必须短而明确 |

## 明确不接入

- 不复制外部 `.claude/agents`、`.claude/skills`、hooks、rules 或模板到生成游戏工作区。
- 不把 Godot、Unity 或 Unreal 专用流程当成微信、抖音、TapTap 的平台适配证明。
- 不复制第三方游戏表达、素材、名称、UI、内容或数值。
- 不把“结构化文档通过”当作自然试玩、手感或发布通过。

这份参考应服务于共享工厂控制面和内部 Skill 设计；生成游戏仍只读取当前 run 的冻结 Artifact，并遵守 Builder/Fixer 工作区权限边界。
