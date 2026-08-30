# MVP 实现计划

## 验收优先级

1. 建立 TypeScript/pnpm 工程、Zod Artifact 契约和原子文件状态存储。
2. 先写测试并观察失败：Schema、转换、人工暂停/恢复、幂等、修复次数和发行完整性。
3. 实现八个岗位与五类 Provider；Mock 路径必须不依赖 API Key。
4. 实现八条 CLI 命令和静态 art review。
5. 实现 `idle-shop-v1` Phaser 模板、测试接口、localStorage 存档与 Vite Web 构建。
6. 用 Playwright 驱动测试接口，捕获截图、console 和 QA JSON。
7. 完成 Repo Skills、`.env.example` 与示例 seed；MVP 仅保留实际运行的 web-lite Adapter。
8. 运行 lint、typecheck、Vitest、Playwright 和 `pnpm factory demo`，从磁盘核验发行目录。

## MVP 默认值

- run-id 使用 UTC 时间和 seed 内容短哈希，避免名称碰撞且便于追踪。
- 默认 Provider 模式为 `mock`；只有显式设置 `FACTORY_PROVIDER_MODE=real` 才走真实边界。
- Mock 图片使用工厂原创生成的 SVG 占位资产，不抓取或复制第三方素材。
- QA 修复上限固定为 2；MVP Mock Fixer 只记录结构化修复动作，真实 Codex Provider 继续同一
  thread。
- release-candidate 只在 QA 通过后生成。

## 完成定义

- 所有要求的 Artifact 和 stage 字段均有 Schema 和测试。
- 无 approval 时正常暂停；写入 approval 后同一 run 恢复并完成。
- 重复 `run/resume` 不重复已完成阶段。
- `demo` 自动模拟唯一的人类批准动作，并真实构建、启动、Playwright 试玩和发行打包。
- 最终命令退出码、测试输出、state、报告、截图和 release 文件均可机器验证。
