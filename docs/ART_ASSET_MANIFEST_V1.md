# 《夜市飞侠：护印突围》Long-map Art Asset Manifest V1

## 交付边界

- Target game: `夜市飞侠：护印突围` (`night-market-hero`)
- Factory run reference: `mobile-chart-adaptation-20260830`（仅 provenance；不把 ignored prototype-a 当源码上游）
- Batch: `LONGMAP FOUNDATION BATCH A / TASK-04`
- Source branch: `feature/longmap-foundation-v1`
- Source parent: `baseline-stable-20260919` → `1f8f7be0fad277431a6c9ee0917d00f007534660`
- Authored topology: 15 chunks × 1600 world px；三段 transition 是实体 chunk
- Recipe source: `src/longmap-scene-recipes.ts`
- Semantic catalog source: `src/longmap-art-catalog.ts`
- Renderer source: `src/component-renderer.ts`

本清单只描述正式美术需求和已经批准的复用项。组件缺失时运行时安全跳过并保留 panorama fallback；不得用 Phaser Graphics、CSS 几何或临时图片冒充建筑、桥、船或灯笼。

## 状态定义

| 状态 | 含义 |
| --- | --- |
| `AVAILABLE` | 文件存在且已经通过当前仓库的来源审核 |
| `REUSE` | 本批次直接复用现有 approved runtime 文件，不生产新图 |
| `MISSING` | 需要后续正式美术生产；当前 renderer 安全跳过 |
| `OPTIONAL` | 不阻塞首版组景，可在生产排期允许时补充 |
| `LATER` | 明确留给后续 Ambient/Elastic Batch，不进入本批次 runtime |
| `REFERENCE_AVAILABLE` | 仅研究参考，可用于造型讨论；不是 production-approved 资产 |

## 15 个 authored chunk 覆盖

| 顺序 | Chunk / scene family | 区域 | 主要美术性格 | 当前组景行为 |
| ---: | --- | --- | --- | --- |
| 01 | `market-01/lantern-main-street` | 闹市 | 临街楼体、主灯绳、连续摊位 | panorama + 可用摊棚/推车；楼体与灯笼串缺失计数 |
| 02 | `market-02/canopy-stall-lane` | 闹市 | 棚布巷、旗幡、摊位转折 | panorama + 可用摊棚/空旗幡；棚布变体缺失计数 |
| 03 | `market-03/teahouse-signage` | 闹市 | 茶楼门面、内檐、招牌 | panorama + 可用内檐；门面/招牌/单灯缺失计数 |
| 04 | `market-04/paifang-market-court` | 闹市 | 牌楼市场庭院、覆巷框 | panorama + 可用牌楼/覆巷框/灯绳 |
| 05 | `transition/market-to-rooftops/climb-to-eaves` | 过渡 | 进入屋脊的上升脚手与内檐 | 目标地区 panorama + 雾；上升结构缺失计数 |
| 06 | `rooftops-01/low-tile-ridges` | 屋脊 | 低位建筑质量块、前景屋檐、高位支撑架、暗棚 | panorama fallback；原子组件缺失计数 |
| 07 | `rooftops-02/stepped-eaves` | 屋脊 | 高位/低位建筑质量块、错层屋檐、暗棚 | panorama fallback；不依赖整栋建筑图 |
| 08 | `rooftops-03/cross-street-roof-bridge` | 屋脊 | 跨街负空间结构、高位支撑架、灯绳 | panorama fallback；桥框只记 visual support |
| 09 | `rooftops-04/open-high-ridge` | 屋脊 | 高位建筑块、前景屋檐、跨街留白、暗棚 | panorama fallback；不生成程序瓦顶 |
| 10 | `transition/rooftops-to-waterfront/descent-to-canal` | 过渡 | 从屋脊下降到河道的坡桥 | 目标地区 panorama + 雾；下降结构缺失计数 |
| 11 | `waterfront-01/narrow-canal` | 水市 | 河岸房屋、窄河、木栈桥 | panorama fallback；船与河岸模块待生产 |
| 12 | `waterfront-02/stone-bridge` | 水市 | 石桥、拱桥、桥下船 | panorama fallback；桥体待生产 |
| 13 | `waterfront-03/cargo-wharf` | 水市 | 大货栈、装卸平台、货船 | panorama fallback；货栈/货船待生产 |
| 14 | `waterfront-04/lantern-boat-market` | 水市 | 满河灯船、水上棚屋、岸边灯架 | panorama fallback；灯船与灯架待生产 |
| 15 | `transition/waterfront-to-market/canal-return-to-market` | 过渡 | 码头/桥/巷口重新进入闹市 | 目标地区 panorama + 雾；回城结构缺失计数 |

## 组件深度约定

ComponentRenderer 只使用以下 Phaser world depth；DOM HUD 不属于此表：

| depth band | depth 范围 | 默认 depth | 规则 |
| --- | ---: | ---: | --- |
| `background architecture` | -18…-12 | -15 | panorama（-20）之上、普通 gameplay 之前；不遮玩家 |
| `mid scenery` | -9…-3 | -6 | 组件组景中层；只做视觉，不生成几何 |
| `foreground occluder` | -2…2 | 1 | 可形成檐口/框景，但仍低于玩家与追兵（当前约 4）和挂点 |

## 已有 approved runtime：直接复用

这些文件标记为 `REUSE`；路径来自正式游戏仓库，不来自 `reference/v04/`。

| Asset ID | 中文名称 / 使用 chunk | 角色 / 状态 | 已有文件路径 | 建议透明背景 | 建议 nominal canvas size | 可否水平镜像 / 是否允许缩放 | 是否是钩锁支撑结构 / 是否需要独立 pivot / mount point | 是否有动态版本 | 遮挡要求 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `market.stallCanopy` | 临街摊棚；M01/M02 | mid / `REUSE` | `src/assets/approved-runtime/environment/stall-canopy-v1.png` | YES | 1024×512 | YES / YES | YES / YES | NO | player-readable |
| `structure.paifangBeam` | 牌楼横梁；M04 | foreground / `REUSE` | `src/assets/approved-runtime/environment/paifang-crossbeam-v1.png` | YES | 1024×384 | YES / YES | YES / YES | NO | foreground-occluder，不能压 HUD |
| `structure.bambooScaffold` | 竹架；M→R 过渡 | mid / `REUSE` | `src/assets/approved-runtime/environment/bamboo-scaffold-v1.png` | YES | 640×960 | YES / YES | YES / YES | NO | player-readable |
| `structure.innerEave` | 内檐框景；M03/M→R/R→W | foreground / `REUSE` | `src/assets/approved-runtime/environment/inner-eave-v1.png` | YES | 512×512 | YES / YES | YES / YES | NO | foreground-occluder |
| `lighting.lanternCable` | 灯绳；M01/M04/过渡/R03/W04 | foreground / `REUSE` | `src/assets/approved-runtime/environment/lantern-cable-v1.png` | YES | 1024×256 | YES / YES | YES / YES | YES（后续弹性版本） | player-readable；不得自动碰撞 |
| `market.pushcart` | 推车；M01/W→M | mid / `REUSE` | `src/assets/approved-runtime/environment/pushcart-v1.png` | YES | 512×384 | YES / YES | NO / NO | NO | behind-player/player-readable |
| `market.blankBanner` | 空白旗幡；M02 | foreground / `REUSE` | `src/assets/approved-runtime/environment/blank-banner-v1.png` | YES | 256×512 | YES / YES | NO / NO | NO | foreground-occluder |
| `market.coveredAlleyFrame` | 覆巷框；M04/W→M | foreground / `REUSE` | `src/assets/approved-runtime/environment/covered-alley-frame-v1.png` | YES | 768×768 | YES / YES | YES / YES | NO | foreground-occluder |

## 闹市：首要缺失需求

| Asset ID | 中文名称 / 使用 chunk | 角色 / 状态 | 已有文件路径 | 建议透明背景 | 建议 nominal canvas size | 可否水平镜像 / 是否允许缩放 | 是否是钩锁支撑结构 / 是否需要独立 pivot / mount point | 是否有动态版本 | 遮挡要求 / 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `market.facadeModule` | 临街楼体模块；M01/M02/M04 | background / `MISSING` | — | YES | 1600×941 | YES / YES | NO / NO | NO | behind-player；需多宽度拼接 |
| `market.awningVariant` | 棚布变体；M02 | mid / `MISSING` | — | YES | 1024×512 | YES / YES | NO / NO | NO | player-readable |
| `market.teahouseFront` | 茶楼/酒肆门面；M03 | mid / `MISSING` | — | YES | 1024×768 | YES / YES | NO / NO | NO | behind-player；门洞透明 |
| `market.lanternString` | 灯笼串；M01/M03 | foreground / `MISSING` | — | YES | 1024×256 | YES / YES | YES / YES | YES | player-readable；未来弹性灯绳拆层 |
| `lighting.singleLantern` | 单灯笼；M03/W→M | ambient / `MISSING` | — | YES | 256×256 | YES / YES | NO / YES（挂点） | YES | player-readable；独立发光层 |
| `structure.woodenRail` | 木栏；M01/M02 | foreground / `MISSING` | — | YES | 768×256 | YES / YES | NO / NO | NO | foreground-occluder |
| `market.signboard` | 招牌/旗幡空白底板；M03 | foreground / `MISSING` | — | YES | 512×256 | YES / YES | NO / YES（挂点） | NO | player-readable；避免可读文字依赖 |

## 屋脊：首要缺失需求（原子化横版组件）

| Asset ID | 中文名称 / 使用 chunk | 角色 / 状态 | 已有文件路径 | 建议透明背景 | 建议 nominal canvas size | 可否水平镜像 / 是否允许缩放 | 是否是钩锁支撑结构 / 是否需要独立 pivot / mount point | 是否有动态版本 | 遮挡要求 / 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `rooftops.lowBuildingMass` | 低位建筑质量块；R01/R02 | background / `MISSING` | — | YES | 1024×384 | YES / YES | NO / NO | NO | behind-player；横向拼接，不能包含完整屋顶 |
| `rooftops.highBuildingMass` | 高位建筑质量块；R02/R03/R04/R→W | background / `MISSING` | — | YES | 1024×512 | YES / YES | NO / NO | NO | behind-player；用于高低错层 |
| `rooftops.foregroundEaveOccluder` | 前景屋檐遮挡条；R01/R02/R04 | foreground / `MISSING` | — | YES | 768×256 | YES / YES | NO / NO | NO | foreground-occluder；不得压 HUD |
| `rooftops.highLanternSupportFrame` | 独立高位支撑架；R01/R03/R04 | support / `MISSING` | — | YES | 768×192 | YES / YES | YES / YES | YES | 后续弹性挂点拆为 beam/knot/cable |
| `rooftops.crossStreetNegativeSpace` | 跨街负空间结构；R03/R04 | support / `MISSING` | — | YES | 1024×384 | YES / YES | YES / YES | NO | 桥框与留白只作 visual support；碰撞另开任务 |
| `rooftops.darkCanopy` | 暗棚/暗檐横向遮片；R01/R02/R03/R04 | mid / `MISSING` | — | YES | 1024×256 | YES / YES | NO / NO | NO | player-readable；控制前后景层次 |

## 水市：首要缺失需求

| Asset ID | 中文名称 / 使用 chunk | 角色 / 状态 | 已有文件路径 | 建议透明背景 | 建议 nominal canvas size | 可否水平镜像 / 是否允许缩放 | 是否是钩锁支撑结构 / 是否需要独立 pivot / mount point | 是否有动态版本 | 遮挡要求 / 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `waterfront.riverHouse` | 河岸房屋/水上棚屋；W01/W02/W04 | background / `MISSING` | — | YES | 1600×768 | YES / YES | NO / NO | NO | behind-player |
| `waterfront.woodenPier` | 木栈桥/船埠；W01/W03 | mid / `MISSING` | — | YES | 1024×384 | YES / YES | NO / NO | NO | player-readable |
| `waterfront.cargoWharf` | 大货栈/装卸平台；W03 | background / `MISSING` | — | YES | 1600×768 | YES / YES | NO / NO | NO | behind-player |
| `waterfront.stoneBridge` | 石桥；W02 | support / `MISSING` | — | YES | 1280×512 | YES / YES | YES / YES | NO | 仅 visual support |
| `waterfront.archBridge` | 拱桥；W02/R→W | support / `MISSING` | — | YES | 1280×768 | YES / YES | YES / YES | NO | 仅 visual support；拱洞透明 |
| `waterfront.sampan` | 乌篷船；W01/W02 | ambient / `MISSING` + `LATER` | — | YES | 768×512 | YES / YES | NO / YES（船身 pivot） | YES | 不在本批次实例化 |
| `waterfront.cargoBoat` | 货船；W03 | ambient / `MISSING` + `LATER` | — | YES | 1024×512 | YES / YES | NO / YES（船身 pivot） | YES | 不在本批次实例化 |
| `waterfront.lanternBoat` | 灯船；W04 | ambient / `MISSING` + `LATER` | — | YES | 1024×768 | YES / YES | NO / YES（灯组 pivot） | YES | 不在本批次实例化 |
| `waterfront.waterRail` | 水边栏杆；W01/W03 | foreground / `MISSING` | — | YES | 768×256 | YES / YES | NO / NO | NO | foreground-occluder |
| `waterfront.lampStand` | 岸边灯架；W04 | foreground / `MISSING` | — | YES | 384×768 | YES / YES | YES / YES | YES | player-readable |
| `waterfront.waterStall` | 水上棚屋/货栈门面；W04 | mid / `MISSING` | — | YES | 1024×768 | YES / YES | NO / NO | NO | player-readable |

## Transition：可视方向结构

| Asset ID | 中文名称 / transition | 角色 / 状态 | 已有文件路径 | 建议透明背景 | 建议 nominal canvas size | 可否水平镜像 / 是否允许缩放 | 是否是钩锁支撑结构 / 是否需要独立 pivot / mount point | 是否有动态版本 | 遮挡要求 / 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `transition.riseScaffold` | 市场 → 屋脊上升脚手 | support / `MISSING` | — | YES | 1280×768 | YES / YES | YES / YES | NO | 只表达上升，不改变 physics |
| `transition.canopyClimb` | 连续棚架/内檐爬升 | mid / `MISSING` | — | YES | 1024×768 | YES / YES | NO / NO | NO | player-readable |
| `transition.canalDescent` | 屋脊 → 水市下降坡桥 | support / `MISSING` | — | YES | 1280×768 | YES / YES | YES / YES | NO | 只表达下降，不自动生成碰撞 |
| `transition.marketReturnBridge` | 水市 → 闹市码头/桥/巷口 | support / `MISSING` | — | YES | 1280×512 | YES / YES | YES / YES | NO | 连接回闹市的视觉门槛 |

## Ambient：只列需求，不实现 runtime

以下资产进入后续 Ambient Layer 生产排期；本批次不创建人物或船实例，不改变默认运行时：

| 需求 | 区域 | 状态 | 透明 / 动态 / pivot 要求 |
| --- | --- | --- | --- |
| 普通路人 | 闹市 | `OPTIONAL` / `LATER` | YES / idle loop / feet pivot |
| 挑担人 | 闹市 | `OPTIONAL` / `LATER` | YES / walk loop / load pivot |
| 推车人 | 闹市 | `OPTIONAL` / `LATER` | YES / push loop / cart pivot |
| 摊主 | 闹市 | `OPTIONAL` / `LATER` | YES / small gesture / stall pivot |
| 搬货人 | 水市 | `OPTIONAL` / `LATER` | YES / carry loop / cargo pivot |
| 靠栏站立人物 | 水市/屋脊 | `OPTIONAL` / `LATER` | YES / breathing loop / rail pivot |
| 乌篷船 | 水市 | `LATER` | YES / bob loop / hull pivot |
| 货船 | 水市 | `LATER` | YES / slow drift / hull pivot |
| 灯船 | 水市 | `LATER` | YES / bob + lantern pulse / lamp pivot |

## Elastic Anchor：只规划资产拆分，不实现物理

后续弹性挂点需要独立透明层和明确 pivot；本批次只把需求写入 manifest：

- `lantern cable support`：支撑梁/高位杆，静态结构层；状态 `LATER`
- `knot`：绳结与挂点标记，独立 pivot；状态 `LATER`
- `lantern body`：可跟随绳端偏移的灯笼主体与 emissive overlay；状态 `LATER`
- `support beam`：牌楼梁、屋脊梁、桥梁等静态支撑；状态 `LATER`
- `pivot`：每个 cable/knot/body/beam 的 authoring mount point；状态 `LATER`

`reference/v04/` 中的绳索、灯笼和人物图像只能标记为 `REFERENCE_AVAILABLE` 研究参考；禁止 production runtime import，禁止复制其参数、表达或资产。

## 当前运行时约束

- 缺失资产：安全跳过，累计 `missingAssetCount`，保留 panorama fallback。
- ComponentRenderer：仅 visual-only；不生成碰撞、不修改 `game-core`、不修改 snapshot schema。
- 默认 URL：组件层关闭，正式路径仍为 panorama base。
- 预览 URL：`?longmap=1`，组件层与 panorama 同时显示。
- `reference/v04` production dependency：NO。
- Ambient runtime implemented: NO
- Elastic physics implemented: NO
- No new art generated: YES
