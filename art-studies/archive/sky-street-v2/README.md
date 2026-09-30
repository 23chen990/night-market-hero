# 夜市飞侠 · 天空底图混合长街

这是独立美术预览。双击 `preview.html` 可离线查看，拖动画面或进度条浏览连续三屏；也可自动漫游、展开画面组成、保存全貌。

目标游戏：夜市飞侠：护印突围。
目标工作区：`/Users/kker/Documents/ChatGPT/妖怪夜市/runs/mobile-chart-adaptation-20260830/workspace/night-market-hero`。
本目录没有接入上述游戏的启动入口、素材清单或构建。

## 画面分工

- 天空：复用同一 run 里已有的 v33 天空雾图；没有完整夜市全景输入。
- 代码：建筑体块、墙柱、瓦面轮廓、木纹、窗格、栏杆、绳线、摊台、人物剪影和灯光。
- 现有小素材：曲檐、支撑块、棚布、单灯笼、推车、布幡、带顶摊位。
- 同一栋建筑按固定位置组装。素材原文件不变，仅在预览目录内裁切透明空边、清理边缘；棚布去掉长立柱部分，交由代码统一支撑。

## 预览文件

- `street-start.png`、`street-center.png`、`street-end.png`：相邻三屏。
- `street-full-5016x941.png`：连续长街原尺寸全貌。
- `phone-center.png`：844×390 横屏视图，保持比例并显示更宽的视野。
- `street-pan.gif`：实际绘图结果的横向移动演示。
- `composition-breakdown.jpg`：天空、代码建筑、完成组景对照。
- `source-manifest.json`：8 张既有素材的来源、裁切范围和 SHA-256。

## 复现

在仓库根目录运行本目录内的 `prepare.py`、`build.py`，然后运行 `node <本目录>/qa/check-preview.cjs` 与 `node <本目录>/qa/export.cjs`。最后运行 `make-deliverables.py` 输出概览、分层图和横向演示。

本预览使用浏览器 Canvas 2D，无网络依赖。Playwright 仅用于预览验证。`qa/workspace-before.json` 记录工作前游戏文件的哈希；独立 QA 对照这些哈希检查隔离性。

## 边界

这是构图和材料的效果候选，80–90% 视觉还原目标尚未获用户确认。飞行通道是视觉示意，没有接入玩法、碰撞或平台包；功能检查通过不代表成品美术已验收。
