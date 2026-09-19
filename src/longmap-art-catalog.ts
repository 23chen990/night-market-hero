export type LongmapAssetStatus = 'AVAILABLE' | 'REUSE' | 'MISSING' | 'OPTIONAL' | 'LATER' | 'REFERENCE_AVAILABLE';
export type LongmapAssetRole = 'background' | 'mid' | 'foreground' | 'support' | 'ambient';

export interface LongmapArtCatalogEntry {
  assetId: string;
  status: LongmapAssetStatus;
  role: LongmapAssetRole;
  path?: string;
  runtimeKey?: string;
  transparent: boolean;
  nominalCanvas: readonly [number, number];
  visualOccupancy: 'low' | 'medium' | 'high';
  allowHorizontalFlip: boolean;
  allowScale: boolean;
  grappleSupport: boolean;
  requiresPivot: boolean;
  dynamicVariant: boolean;
  occlusion: 'behind-player' | 'player-readable' | 'foreground-occluder';
  note?: string;
}

function available(
  assetId: string,
  path: string,
  runtimeKey: string,
  role: LongmapAssetRole,
  nominalCanvas: readonly [number, number],
  options: Partial<Pick<LongmapArtCatalogEntry, 'visualOccupancy' | 'allowHorizontalFlip' | 'grappleSupport' | 'requiresPivot' | 'dynamicVariant' | 'occlusion'>> = {},
): LongmapArtCatalogEntry {
  return {
    assetId,
    status: 'AVAILABLE',
    role,
    path: new URL(path, import.meta.url).href,
    runtimeKey,
    transparent: true,
    nominalCanvas,
    visualOccupancy: options.visualOccupancy ?? 'medium',
    allowHorizontalFlip: options.allowHorizontalFlip ?? true,
    allowScale: true,
    grappleSupport: options.grappleSupport ?? false,
    requiresPivot: options.requiresPivot ?? false,
    dynamicVariant: options.dynamicVariant ?? false,
    occlusion: options.occlusion ?? 'player-readable',
  };
}

function missing(
  assetId: string,
  role: LongmapAssetRole,
  nominalCanvas: readonly [number, number],
  note: string,
  options: Partial<Pick<LongmapArtCatalogEntry, 'visualOccupancy' | 'allowHorizontalFlip' | 'grappleSupport' | 'requiresPivot' | 'dynamicVariant' | 'occlusion'>> = {},
): LongmapArtCatalogEntry {
  return {
    assetId,
    status: 'MISSING',
    role,
    transparent: true,
    nominalCanvas,
    visualOccupancy: options.visualOccupancy ?? 'medium',
    allowHorizontalFlip: options.allowHorizontalFlip ?? true,
    allowScale: true,
    grappleSupport: options.grappleSupport ?? false,
    requiresPivot: options.requiresPivot ?? false,
    dynamicVariant: options.dynamicVariant ?? false,
    occlusion: options.occlusion ?? 'player-readable',
    note,
  };
}

/** Semantic IDs used by authored scene recipes. No recipe references a file path directly. */
export const LONGMAP_ART_CATALOG: Readonly<Record<string, LongmapArtCatalogEntry>> = Object.freeze({
  'market.stallCanopy': available('market.stallCanopy', './assets/approved-runtime/environment/stall-canopy-v1.png', 'longmap-component-market-stall-canopy', 'mid', [1_024, 512], { grappleSupport: true, requiresPivot: true }),
  'structure.paifangBeam': available('structure.paifangBeam', './assets/approved-runtime/environment/paifang-crossbeam-v1.png', 'longmap-component-structure-paifang-beam', 'foreground', [1_024, 384], { visualOccupancy: 'high', grappleSupport: true, requiresPivot: true }),
  'structure.bambooScaffold': available('structure.bambooScaffold', './assets/approved-runtime/environment/bamboo-scaffold-v1.png', 'longmap-component-structure-bamboo-scaffold', 'mid', [640, 960], { grappleSupport: true, requiresPivot: true }),
  'structure.innerEave': available('structure.innerEave', './assets/approved-runtime/environment/inner-eave-v1.png', 'longmap-component-structure-inner-eave', 'foreground', [512, 512], { grappleSupport: true, requiresPivot: true }),
  'lighting.lanternCable': available('lighting.lanternCable', './assets/approved-runtime/environment/lantern-cable-v1.png', 'longmap-component-lighting-lantern-cable', 'foreground', [1_024, 256], { grappleSupport: true, requiresPivot: true, dynamicVariant: true }),
  'market.pushcart': available('market.pushcart', './assets/approved-runtime/environment/pushcart-v1.png', 'longmap-component-market-pushcart', 'mid', [512, 384]),
  'market.blankBanner': available('market.blankBanner', './assets/approved-runtime/environment/blank-banner-v1.png', 'longmap-component-market-blank-banner', 'foreground', [256, 512], { visualOccupancy: 'low' }),
  'market.coveredAlleyFrame': available('market.coveredAlleyFrame', './assets/approved-runtime/environment/covered-alley-frame-v1.png', 'longmap-component-market-covered-alley-frame', 'foreground', [768, 768], { visualOccupancy: 'high', grappleSupport: true, requiresPivot: true }),

  'market.facadeModule': missing('market.facadeModule', 'background', [1_600, 941], '临街楼体模块，需多宽度透明变体', { visualOccupancy: 'high', occlusion: 'behind-player' }),
  'market.awningVariant': missing('market.awningVariant', 'mid', [1_024, 512], '棚布变体，避免四段闹市只复用一个棚面'),
  'market.teahouseFront': missing('market.teahouseFront', 'mid', [1_024, 768], '茶楼/酒肆门面与独立门洞'),
  'market.lanternString': missing('market.lanternString', 'foreground', [1_024, 256], '灯笼串，需透明绳段与灯笼间距变体', { grappleSupport: true, requiresPivot: true, dynamicVariant: true }),
  'lighting.singleLantern': missing('lighting.singleLantern', 'ambient', [256, 256], '单灯笼补位与可替换发光层', { visualOccupancy: 'low', dynamicVariant: true }),
  'structure.woodenRail': missing('structure.woodenRail', 'foreground', [768, 256], '木栏与临街边缘模块'),
  'market.signboard': missing('market.signboard', 'foreground', [512, 256], '招牌/旗幡空白底板与可替换挂点'),

  'rooftops.tileRoof': missing('rooftops.tileRoof', 'background', [1_600, 768], '低瓦顶与高瓦顶可拼接模块', { visualOccupancy: 'high', occlusion: 'behind-player' }),
  'rooftops.flyingEave': missing('rooftops.flyingEave', 'foreground', [768, 512], '飞檐角，需独立 pivot'),
  'rooftops.roofBridge': missing('rooftops.roofBridge', 'support', [1_024, 384], '跨街屋桥，仅视觉支撑；碰撞另行设计', { grappleSupport: true, requiresPivot: true }),
  'rooftops.attic': missing('rooftops.attic', 'mid', [768, 768], '小阁楼与高低错层连接'),
  'rooftops.highLanternSupport': missing('rooftops.highLanternSupport', 'support', [1_024, 256], '高位灯绳支撑结构', { grappleSupport: true, requiresPivot: true, dynamicVariant: true }),
  'rooftops.flag': missing('rooftops.flag', 'foreground', [256, 512], '屋脊旗幡'),
  'rooftops.silhouette': missing('rooftops.silhouette', 'background', [1_600, 768], '远景屋顶剪影层', { visualOccupancy: 'high', occlusion: 'behind-player' }),

  'waterfront.riverHouse': missing('waterfront.riverHouse', 'background', [1_600, 768], '河岸房屋与水上棚屋模块', { visualOccupancy: 'high', occlusion: 'behind-player' }),
  'waterfront.woodenPier': missing('waterfront.woodenPier', 'mid', [1_024, 384], '木栈桥与船埠连接'),
  'waterfront.cargoWharf': missing('waterfront.cargoWharf', 'background', [1_600, 768], '大货栈与装卸平台模块', { visualOccupancy: 'high', occlusion: 'behind-player' }),
  'waterfront.stoneBridge': missing('waterfront.stoneBridge', 'support', [1_280, 512], '石桥与拱桥结构，仅视觉支撑', { grappleSupport: true, requiresPivot: true }),
  'waterfront.archBridge': missing('waterfront.archBridge', 'support', [1_280, 768], '拱桥高低落差结构', { grappleSupport: true, requiresPivot: true }),
  'waterfront.sampan': missing('waterfront.sampan', 'ambient', [768, 512], '乌篷船，后续 Ambient runtime 使用', { visualOccupancy: 'high' }),
  'waterfront.cargoBoat': missing('waterfront.cargoBoat', 'ambient', [1_024, 512], '货船，后续 Ambient runtime 使用', { visualOccupancy: 'high' }),
  'waterfront.lanternBoat': missing('waterfront.lanternBoat', 'ambient', [1_024, 768], '灯船，后续 Ambient runtime 使用', { visualOccupancy: 'high', dynamicVariant: true }),
  'waterfront.waterRail': missing('waterfront.waterRail', 'foreground', [768, 256], '水边栏杆'),
  'waterfront.lampStand': missing('waterfront.lampStand', 'foreground', [384, 768], '岸边灯架', { dynamicVariant: true }),
  'waterfront.waterStall': missing('waterfront.waterStall', 'mid', [1_024, 768], '水上棚屋与货栈门面'),

  'transition.riseScaffold': missing('transition.riseScaffold', 'support', [1_280, 768], '市场进入屋脊的上升结构', { grappleSupport: true, requiresPivot: true }),
  'transition.canopyClimb': missing('transition.canopyClimb', 'mid', [1_024, 768], '连续棚架/内檐爬升段'),
  'transition.canalDescent': missing('transition.canalDescent', 'support', [1_280, 768], '屋脊下降至河道的坡桥结构', { grappleSupport: true, requiresPivot: true }),
  'transition.marketReturnBridge': missing('transition.marketReturnBridge', 'support', [1_280, 512], '码头/桥/巷口重新进入闹市', { grappleSupport: true, requiresPivot: true }),
});

export function getLongmapArt(assetId: string): LongmapArtCatalogEntry | undefined {
  return LONGMAP_ART_CATALOG[assetId];
}

export function availableLongmapArt(): LongmapArtCatalogEntry[] {
  return Object.values(LONGMAP_ART_CATALOG).filter((entry) => entry.status === 'AVAILABLE' || entry.status === 'REUSE');
}
