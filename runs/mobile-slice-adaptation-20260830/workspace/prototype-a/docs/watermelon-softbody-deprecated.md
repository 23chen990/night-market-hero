# 西瓜软体方案暂停、废弃记录

用户于 2026-10-03 明确选择单个西瓜演示的闭合两半切开效果，并要求刀具也使用该演示版本。

当前默认游戏的西瓜切割由 `game-watermelon-visuals.ts` 接管，复用 `watermelon-cleave.ts` 的原球体切片、果皮/红瓤/种子材质和连续打开时间线。刀具由 `cleave-visuals.ts` 共用；`game-core.ts` 在可见刀刃轮廓经过目标中心后才触发西瓜切割。

原 `melon-visuals.ts`、`melon-material.ts` 的西瓜呈现以及 MelonBody 西瓜专用网格已退出默认游戏入口。保留源码、历史实验和测试供查阅，不继续修补该西瓜呈现。原因：多次修复仍未达到刀入中心、两半沿刀面劈开的可见效果，软体轮廓和切面时序不稳定。

`three-cut-visuals.ts` 中其他食物的原模型切片与 AuthoredCutBody 是其他 agent 已完成的工作，保留当前接入方式。新的其他物品效果预览在 `food-cleave.html`，展示原模型的封闭两半与各自切面材质。

旧 `qa-all-food-melon.ts`、`qa-melon-integration.ts`、`browser-smoke.ts` 的 `melon-softbody` 要求只描述废弃实验路径；当前默认入口的验收使用 `tests/default-cleave-browser.ts`。历史通过结果不用于证明当前西瓜体验。
