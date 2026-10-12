# 夜市飞侠：护印突围

手机横屏、一根手指的夜市飞索游戏。当前改动直接作用于 `index.html → src/main.ts`，不是平行演示页面。

**先读 [当前可玩入口](PLAYABLE_START_HERE.md)、[本轮交付说明](docs/DELIVERY_20261012_ZH.md)、[验收与后续开发约束](docs/PLAYABLE_ACCEPTANCE.md)。开发代理还必须阅读 [AGENTS.md](AGENTS.md)。** `docs/history/`、旧 QA 与美术研究只是历史背景，不能代替当前构建证据。

## 试玩流程

打开构建后的独立 HTML，点击“开始护送”。按住屏幕或空格摆荡，看到“现在松手”时松开，再按住接下一个挂点。教学结束后进入夜巡。

夜巡前段第 2、4、6、8 个地图段依次安排货运滑索、纸鸢、灯笼群和青鸾；每种载具有实际形象、不同操作、提示和剩余时间。之后仍有种子驱动的变化。暂停菜单可主动收工，结算后领取已达成任务，用金币购买并选择角色，再跑一次。不是自动播放，操作失误仍可能失败。

## 独立安装和构建

使用 Node 22 与已提交的 `package-lock.json`：

```sh
npm ci
npm run check
npm run build
```

`dist/index.html` 是内联资源的独立试玩文件，可以改名并移到空目录打开。源码 `index.html` 不是供用户双击的发布文件。`dist/` 和大 HTML 不提交源码历史，通过 Actions 产物交付。

## 浏览器验收

```sh
npx playwright install --with-deps chromium webkit
npm run test:file
npm run test:play
npm run test:safety
node --import tsx tests/playable-menu-audit.ts
npm run verify:release
```

GitHub Actions 的 `Playable audit` 执行构建、静态检查、完整单测和 WebKit 原文件/改名单文件启动；`Browser playable evidence` 执行真实时钟下的触控/键盘旅程、失败恢复、四种载具与四处交界截图、任务/角色/重开/刷新、窄屏菜单与旋转屏幕检查。

当前审查范围与原始证据位于 `evidence/playable-upgrade-20261012/`。`verify:release` 先重建，再校验报告中的构建哈希；改动运行时会使旧证据失效。归档工具只验证和搬运已经执行、已经查看的证据，不自动审批美术。

## 交付边界

当前证明的是 **浏览器可玩流程与指定画面的回归验收**，不是陌生玩家盲测，也不是所有种子、设备、长局都无缺陷。载具目前使用代码绘制形象，与背景插画的美术统一度仍有提升空间。

微信、抖音、TapTap 包体、宿主、真实广告与实机性能仍须单独验证；浏览器通过不等于三平台可上架。`commercialReleasePassed` 保持 `false`。
