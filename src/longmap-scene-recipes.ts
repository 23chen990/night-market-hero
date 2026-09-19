import type { RunPlanChunkDescriptor, RunPlanDistrict } from './run-plan.ts';

export type ComponentDepthBand = 'background-architecture' | 'mid-scenery' | 'foreground-occluder';
export type ComponentOcclusionRole = 'background' | 'player-readable' | 'foreground';
export type ComponentSupportRole = 'none' | 'visual-support-candidate';

export interface SceneComponentPlacement {
  placementId: string;
  assetId: string;
  x: number;
  y: number;
  scale: number;
  scaleY: number;
  flipX: boolean;
  depthBand: ComponentDepthBand;
  occlusionRole: ComponentOcclusionRole;
  supportRole: ComponentSupportRole;
}

export interface LongmapSceneRecipe {
  sceneFamily: string;
  district: RunPlanDistrict;
  kind: RunPlanChunkDescriptor['kind'];
  placements: readonly SceneComponentPlacement[];
}

function placement(
  placementId: string,
  assetId: string,
  x: number,
  y: number,
  scale: number,
  depthBand: ComponentDepthBand,
  occlusionRole: ComponentOcclusionRole,
  supportRole: ComponentSupportRole = 'none',
  flipX = false,
  scaleY = scale,
): SceneComponentPlacement {
  return { placementId, assetId, x, y, scale, scaleY, flipX, depthBand, occlusionRole, supportRole };
}

const RECIPE_LIST: readonly LongmapSceneRecipe[] = [
  {
    sceneFamily: 'market-01/lantern-main-street', district: 'market', kind: 'district',
    placements: [
      placement('facade-left', 'market.facadeModule', 0, 80, 1, 'background-architecture', 'background'),
      placement('stall-center', 'market.stallCanopy', 420, 420, 0.78, 'mid-scenery', 'player-readable', 'visual-support-candidate'),
      placement('lantern-cable', 'lighting.lanternCable', 720, 188, 0.72, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
      placement('pushcart', 'market.pushcart', 1_120, 584, 0.48, 'mid-scenery', 'player-readable'),
    ],
  },
  {
    sceneFamily: 'market-02/canopy-stall-lane', district: 'market', kind: 'district',
    placements: [
      placement('facade-right', 'market.facadeModule', 0, 62, 1, 'background-architecture', 'background', 'none', true),
      placement('awning-variant', 'market.awningVariant', 260, 350, 0.7, 'mid-scenery', 'player-readable'),
      placement('stall-left', 'market.stallCanopy', 760, 430, 0.66, 'mid-scenery', 'player-readable', 'visual-support-candidate', true),
      placement('blank-banner', 'market.blankBanner', 1_220, 248, 0.44, 'foreground-occluder', 'foreground'),
    ],
  },
  {
    sceneFamily: 'market-03/teahouse-signage', district: 'market', kind: 'district',
    placements: [
      placement('teahouse', 'market.teahouseFront', 0, 56, 0.96, 'background-architecture', 'background'),
      placement('inner-eave', 'structure.innerEave', 370, 284, 0.7, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
      placement('signboard', 'market.signboard', 920, 238, 0.5, 'foreground-occluder', 'foreground'),
      placement('single-lantern', 'lighting.singleLantern', 1_300, 182, 0.32, 'foreground-occluder', 'foreground'),
    ],
  },
  {
    sceneFamily: 'market-04/paifang-market-court', district: 'market', kind: 'district',
    placements: [
      placement('paifang', 'structure.paifangBeam', 110, 188, 0.88, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
      placement('court-facade', 'market.facadeModule', 0, 84, 0.94, 'background-architecture', 'background'),
      placement('covered-alley', 'market.coveredAlleyFrame', 1_030, 210, 0.52, 'foreground-occluder', 'foreground', 'visual-support-candidate', true),
      placement('court-lantern', 'lighting.lanternCable', 590, 162, 0.56, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
    ],
  },
  {
    sceneFamily: 'transition/market-to-rooftops/climb-to-eaves', district: 'rooftops', kind: 'transition',
    placements: [
      placement('rise-scaffold', 'transition.riseScaffold', 0, 48, 0.9, 'background-architecture', 'background', 'visual-support-candidate'),
      placement('bamboo-climb', 'structure.bambooScaffold', 420, 154, 0.56, 'mid-scenery', 'player-readable', 'visual-support-candidate'),
      placement('canopy-climb', 'transition.canopyClimb', 780, 92, 0.68, 'mid-scenery', 'player-readable'),
      placement('climb-lantern', 'lighting.lanternCable', 1_060, 116, 0.5, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
    ],
  },
  {
    sceneFamily: 'rooftops-01/low-tile-ridges', district: 'rooftops', kind: 'district',
    placements: [
      placement('low-roof', 'rooftops.tileRoof', 0, 210, 0.94, 'background-architecture', 'background'),
      placement('flying-eave', 'rooftops.flyingEave', 510, 168, 0.64, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
      placement('high-lantern-support', 'rooftops.highLanternSupport', 880, 122, 0.62, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
    ],
  },
  {
    sceneFamily: 'rooftops-02/stepped-eaves', district: 'rooftops', kind: 'district',
    placements: [
      placement('stepped-roof', 'rooftops.tileRoof', 0, 150, 0.84, 'background-architecture', 'background'),
      placement('attic', 'rooftops.attic', 520, 198, 0.56, 'mid-scenery', 'player-readable'),
      placement('flag', 'rooftops.flag', 1_120, 104, 0.38, 'foreground-occluder', 'foreground', 'none', true),
      placement('inner-eave', 'structure.innerEave', 820, 294, 0.54, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
    ],
  },
  {
    sceneFamily: 'rooftops-03/cross-street-roof-bridge', district: 'rooftops', kind: 'district',
    placements: [
      placement('ridge-silhouette', 'rooftops.silhouette', 0, 70, 0.98, 'background-architecture', 'background'),
      placement('roof-bridge', 'rooftops.roofBridge', 360, 242, 0.7, 'mid-scenery', 'player-readable', 'visual-support-candidate'),
      placement('bridge-lantern', 'rooftops.highLanternSupport', 1_000, 126, 0.48, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
      placement('bridge-cable', 'lighting.lanternCable', 1_220, 168, 0.36, 'foreground-occluder', 'foreground', 'visual-support-candidate', true),
    ],
  },
  {
    sceneFamily: 'rooftops-04/open-high-ridge', district: 'rooftops', kind: 'district',
    placements: [
      placement('open-ridge', 'rooftops.silhouette', 0, 38, 1, 'background-architecture', 'background'),
      placement('high-flying-eave', 'rooftops.flyingEave', 420, 114, 0.66, 'foreground-occluder', 'foreground', 'visual-support-candidate', true),
      placement('open-bridge', 'rooftops.roofBridge', 820, 278, 0.58, 'mid-scenery', 'player-readable', 'visual-support-candidate'),
      placement('ridge-flag', 'rooftops.flag', 1_310, 92, 0.34, 'foreground-occluder', 'foreground'),
    ],
  },
  {
    sceneFamily: 'transition/rooftops-to-waterfront/descent-to-canal', district: 'waterfront', kind: 'transition',
    placements: [
      placement('descent-roof', 'rooftops.tileRoof', 0, 84, 0.82, 'background-architecture', 'background'),
      placement('canal-descent', 'transition.canalDescent', 360, 160, 0.78, 'mid-scenery', 'player-readable', 'visual-support-candidate'),
      placement('descent-arch', 'waterfront.archBridge', 850, 224, 0.54, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
      placement('descent-eave', 'structure.innerEave', 1_260, 300, 0.42, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
    ],
  },
  {
    sceneFamily: 'waterfront-01/narrow-canal', district: 'waterfront', kind: 'district',
    placements: [
      placement('canal-houses', 'waterfront.riverHouse', 0, 90, 0.96, 'background-architecture', 'background'),
      placement('wooden-pier', 'waterfront.woodenPier', 420, 344, 0.7, 'mid-scenery', 'player-readable', 'visual-support-candidate'),
      placement('water-rail', 'waterfront.waterRail', 900, 424, 0.54, 'foreground-occluder', 'foreground'),
      placement('sampan', 'waterfront.sampan', 1_180, 454, 0.48, 'mid-scenery', 'player-readable'),
    ],
  },
  {
    sceneFamily: 'waterfront-02/stone-bridge', district: 'waterfront', kind: 'district',
    placements: [
      placement('bridge-house', 'waterfront.riverHouse', 0, 76, 0.9, 'background-architecture', 'background'),
      placement('stone-bridge', 'waterfront.stoneBridge', 300, 252, 0.74, 'mid-scenery', 'player-readable', 'visual-support-candidate'),
      placement('arch-bridge', 'waterfront.archBridge', 840, 280, 0.5, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
      placement('bridge-sampan', 'waterfront.sampan', 1_260, 478, 0.36, 'mid-scenery', 'player-readable', 'none', true),
    ],
  },
  {
    sceneFamily: 'waterfront-03/cargo-wharf', district: 'waterfront', kind: 'district',
    placements: [
      placement('cargo-wharf', 'waterfront.cargoWharf', 0, 188, 0.92, 'background-architecture', 'background'),
      placement('cargo-pier', 'waterfront.woodenPier', 360, 348, 0.62, 'mid-scenery', 'player-readable', 'visual-support-candidate'),
      placement('cargo-boat', 'waterfront.cargoBoat', 890, 420, 0.52, 'mid-scenery', 'player-readable'),
      placement('wharf-rail', 'waterfront.waterRail', 1_190, 410, 0.48, 'foreground-occluder', 'foreground'),
    ],
  },
  {
    sceneFamily: 'waterfront-04/lantern-boat-market', district: 'waterfront', kind: 'district',
    placements: [
      placement('boat-houses', 'waterfront.riverHouse', 0, 80, 0.88, 'background-architecture', 'background'),
      placement('water-stall', 'waterfront.waterStall', 370, 260, 0.64, 'mid-scenery', 'player-readable'),
      placement('lantern-boat', 'waterfront.lanternBoat', 820, 396, 0.62, 'mid-scenery', 'player-readable'),
      placement('lamp-stand', 'waterfront.lampStand', 1_280, 216, 0.42, 'foreground-occluder', 'foreground'),
      placement('boat-cable', 'lighting.lanternCable', 1_060, 142, 0.42, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
    ],
  },
  {
    sceneFamily: 'transition/waterfront-to-market/canal-return-to-market', district: 'market', kind: 'transition',
    placements: [
      placement('return-bridge', 'transition.marketReturnBridge', 0, 224, 0.84, 'mid-scenery', 'player-readable', 'visual-support-candidate'),
      placement('return-alley', 'market.coveredAlleyFrame', 430, 218, 0.52, 'foreground-occluder', 'foreground', 'visual-support-candidate'),
      placement('return-cart', 'market.pushcart', 900, 532, 0.44, 'mid-scenery', 'player-readable'),
      placement('return-lantern', 'lighting.singleLantern', 1_260, 170, 0.3, 'foreground-occluder', 'foreground'),
    ],
  },
];

const RECIPES = new Map(RECIPE_LIST.map((recipe) => [recipe.sceneFamily, recipe]));

export function getLongmapSceneRecipe(sceneFamily: string): LongmapSceneRecipe | undefined {
  return RECIPES.get(sceneFamily);
}

/** Apply the chunk's deterministic layout variant without changing physics. */
export function placementsForChunk(chunk: RunPlanChunkDescriptor): SceneComponentPlacement[] {
  const recipe = getLongmapSceneRecipe(chunk.sceneFamily);
  if (!recipe) return [];
  return recipe.placements.map((source, index) => ({
    ...source,
    x: source.x + ((chunk.layoutVariant + index) % 3 - 1) * 18,
    y: source.y + (chunk.variant % 2 === 0 ? 0 : 6),
    flipX: source.flipX !== (chunk.variant === 3 && index % 2 === 0),
  }));
}

export function allLongmapSceneRecipes(): LongmapSceneRecipe[] {
  return [...RECIPE_LIST];
}
