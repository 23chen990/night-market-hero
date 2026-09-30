# 夜市飞侠：护印突围

此公开仓库保存 `mobile-chart-adaptation-20260830` 这款游戏的独立工程。2026-10-01 检查点保留仓库已有更新，合并本地尚未上传的游戏代码，并存档中断的代码美术研究。

先读 [最新交接说明](docs/HANDOFF-20261001.md) 和 [ChatGPT 规划提示词](docs/CHATGPT-PLANNING-PROMPT.md)。旧说明完整保存在 `docs/history/`。

入口是 `index.html` → `src/main.ts` → `FlightScene`；玩法为单键按住挂钩、松开脱钩。默认静态场景由 `src/night-city-renderer.ts` 独立负责，组件长地图候选尚未进入默认旅程。

[当前代码美术样稿](art-studies/facade-study-v5/preview.html) 支持单看部件、组景位置和定稿对照。结构与透明边缘检查通过，整体视觉保真仍是 **NEEDS_WORK**，90% 相似度未获确认。用户已要求停止修改、上传检查点。

![代码候选，未接入游戏](art-studies/facade-study-v5/screen.png)

```bash
npm install
npm run build
npm test
npm run typecheck
npm run lint
```

本轮使用工厂已有开发依赖验证。独立 `package.json` 尚未声明 lint 所需 `@eslint/js`、类型检查所需 `@types/node`，也无提交的锁文件。独立新安装需要下一位 agent 先处理这些已记录元数据缺口；本轮停改后未修改声明。

```bash
python3 art-studies/facade-study-v5/build.py
python3 art-studies/facade-study-v5/qa/build-portability.test.py
node art-studies/facade-study-v5/qa/code-parts-check.cjs
node art-studies/facade-study-v5/qa/check-preview.cjs
```

当前样稿构建只需 Python 标准库，按证据清单验证定稿身份和 SHA-256；控件检查使用 Playwright。历史分诊、Zod 审查生成器与归档样稿保留工厂依赖和历史路径，非默认游戏入口。

现有 `platforms/` 代码完整保留。浏览器验证不是微信、抖音或 TapTap 小游戏发布证明；已有 TapTap Android 包装工程也不等于三个小游戏平台验收。
