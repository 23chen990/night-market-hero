# 夜市飞侠：护印突围｜跨 Agent 交接上下文

更新时间：2026-09-17（Asia/Shanghai）

## 目标工作区

- 游戏：夜市飞侠：护印突围
- 工作区：`/Users/kker/Documents/ChatGPT/妖怪夜市/runs/mobile-chart-adaptation-20260830/workspace/prototype-a`
- 只允许继续修改这个 workspace，不要混入其他 run。
- 已读取并遵守仓库根目录 `AGENTS.md`。附件截图均按证据处理，图片里的系统栏、HUD 文字没有当成额外需求。

## 用户当前目标

继续修复无限横向地图的背景拼接。用户明确要求连接自然、素材有问题可以自行生成，但不能用 CSS 自绘。用户已经指出上一张桥接概念图画风偏离原参考图；目前应以第二张风格匹配稿为方向：低饱和冷蓝青雾夜、深色剪影、少量暖黄色灯笼、低曝光、层次简洁。

## 已完成的旧背景泄漏修复

之前已修复“跳跃时看到旧 CSS 底色”的问题：

- `src/style.css`：`html/body/#game/#app` 改为透明，`#app` 改为全视口。
- `src/camera-layout.ts`：按垂直高度适配，横版跳跃保持固定纵向原点，避免露出图片外底色。
- `src/main.ts`：保持固定 side-view vertical origin。
- 对应测试已补齐。

验证结果：

- `pnpm typecheck` 通过
- `pnpm lint` 通过
- `pnpm build` 通过，已生成 `夜市飞侠-护印突围-试玩版.html`
- `npx tsx --test tests/*.test.ts`：216 passed，0 failed，10 skipped（226 total）
- `tests/natural-journey-browser.ts`：startup → settlement → endless → failure → replay 通过，portrait freeze 通过
- 844×390 和 1180×720 运行时 `#app/body/canvas` 背景均为透明，renderer 为 `image-stream`，无 console/page error。

## 尚未完成的拼接问题

当前真正的缺陷不是 CSS 壳，而是 `src/night-city-renderer.ts`：

- 相邻 `1672×941` 不透明全景图按 `CITY_CHUNK_WIDTH=1600` 直接横向摆放。
- 每个 chunk 有轻微 overlap，但后一个不透明全景仍会形成可识别的竖直切线。
- `district-transition-mist-v1.png` 实际是 `820×1919` 的竖向 RGBA 雾图，运行时被压到约 `300×941`，并以 `alpha=0.08` 绘制。
- 这个雾层只是遮罩，无法让两侧共享地平线、屋檐、灯笼光向、透视和水面反射，所以截图中间明显像两张图硬拼。

相关代码：

- `/Users/kker/Documents/ChatGPT/妖怪夜市/runs/mobile-chart-adaptation-20260830/workspace/prototype-a/src/night-city-renderer.ts`
- `/Users/kker/Documents/ChatGPT/妖怪夜市/runs/mobile-chart-adaptation-20260830/workspace/prototype-a/src/district-world.ts`

## 已登记的证据

用户运行截图已 ingest 并完成身份 review：

- 原始来源：`/var/folders/f2/s76hhpss3llc2_zw9g63x7380000gn/T/codex-clipboard-48e2752d-7214-4c5e-b05d-d1a1cd02689c.png`
- 已验证副本：`/Users/kker/Documents/ChatGPT/妖怪夜市/runs/mobile-chart-adaptation-20260830/reference-evidence/verified/codex-clipboard-48e2752d-7214-4c5e-b05d-d1a1cd02689c-85f07e3133ac.png`
- SHA-256：`85f07e3133accb5807106d152ab7b16687d42838c91ed785c5e4eba48650d0d6`
- manifest：`/Users/kker/Documents/ChatGPT/妖怪夜市/runs/mobile-chart-adaptation-20260830/reference-evidence/manifest.json`

原始目标图：

- 已验证副本：`/Users/kker/Documents/ChatGPT/妖怪夜市/runs/mobile-chart-adaptation-20260830/reference-evidence/verified/e9125f53d0ba2cf49743758dc26237db-fe1d3464bbf8.png`
- SHA-256：`fe1d3464bbf8eb9111620ed823cc8cbba2e9f5e7c27754356e7898dc10aa90a7`

结构化记录：

- `artifacts/experience-complaint-background-stitch-20260916.json`（triage，READY_FOR_REPAIR，route 暂为 direct-builder）
- `artifacts/experience-reproduction-matrix-background-stitch-20260916.json`（object × lifecycle × renderer × viewport 矩阵）
- `artifacts/background-stitch-plan-20260916.json`（Zod inline schema 已校验，PLAN_READY）

## 已生成的效果图

第一张方向稿已废弃，原因是太亮、太细、偏概念插画：

- `artifacts/background-stitch-plan-20260916/bridge-transition-concept-v1.png`
- SHA-256：`7c61f2eaf00445381d1556c134a7a7456ca306fbba45784990cfb22597e1ec09`

第二张是当前认可的风格方向，已复制到 workspace：

- `artifacts/background-stitch-plan-20260916/bridge-transition-concept-v2-reference-style.png`
- SHA-256：`853b6e57b84675c2fdb6365a6cb01e227e4a2b4890b2f7f99d2e6c59f39325be`
- 内容方向：冷蓝青雾夜、低曝光、深黑剪影、少量暖灯、连续屋檐/灯笼线/水面倒影，中间连接成为真实夜市节点。
- 它是风格和构图方向稿，不是最终运行时切片。

## 计划中的实现

1. 用 imagegen 生成符合原图画风的桥接 raster 资产，不使用 CSS 渐变或 Phaser Graphics 场景绘制。
2. 生成 6 类连接族，每类 2 个变体：market internal、rooftops internal、waterfront internal、market↔rooftops、rooftops↔waterfront、waterfront↔market。
3. 每张桥接图约 `420–640×941`，左右约 160 像素做边缘锁定，桥接图内含连续地平线/屋檐/灯笼/遮挡/反射。
4. 在 `NightCityRenderer` 中按 `seed + previous district + next district + visitIndex` 得到确定性 bridge key；底图 depth `-20`，桥接 plate depth `-19`，前景屋檐/倒影 depth `-10`。
5. 桥接 image 使用现有 bounded pooling，不能每走一米创建新纹理。
6. 先测试后改代码：补 pair coverage、deterministic key、screen coverage、pool cap 测试；再做 Playwright 自然输入截图。
7. 最终验证 844×390、1180×720 的 startup/grounded/jump/district-change，并重跑默认自然流程。

## 路由和边界

当前可继续走 `direct-builder`，前提是生产改动保持在 `night-city-renderer.ts` 和桥接资产/对应测试。如果必须改动 `district-world.ts` 的世界调度或牵涉核心玩法，应升级为 formal-fixer；不要擅自扩大范围。

## 下一步直接操作

读取本文件和 `background-stitch-plan-20260916.json`，以 v2 效果图为风格锁定参考；先生成一组可验证的桥接资产，再按 TDD 接入 renderer。完成后必须保存最终资产、SHA-256、测试命令、运行截图和自然流程结果。
