import type { AreaId, Point } from '../game/simulation';

export type AreaLayout = {
  id: AreaId;
  title: string;
  chain: readonly string[];
  bounds: { x: number; y: number; width: number; height: number };
  viewport: { width: number; height: number };
};

const VIEWPORT = { width: 540, height: 960 } as const;
const titles = ['沙滩鱼摊', '小码头', '海鲜市场', '加工厨房', '远洋码头', '海岛贸易'] as const;
const chains = [
  ['捕鱼', '鲜鱼冰盘', '收银'],
  ['卸货', '补货', '多件订单'],
  ['分拣', '海鲜货架', '满意度'],
  ['加工', '组合商品', '批量交付'],
  ['远洋来货', '配送', '订单结算'],
  ['海岛探索', '贸易', '区域奖励'],
] as const;

export const AREA_LAYOUTS: Record<AreaId, AreaLayout> = {
  1: { id: 1, title: titles[0], chain: chains[0], bounds: { x: 0, y: 0, width: 540, height: 960 }, viewport: VIEWPORT },
  2: { id: 2, title: titles[1], chain: chains[1], bounds: { x: 540, y: 0, width: 540, height: 960 }, viewport: VIEWPORT },
  3: { id: 3, title: titles[2], chain: chains[2], bounds: { x: 1080, y: 0, width: 540, height: 960 }, viewport: VIEWPORT },
  4: { id: 4, title: titles[3], chain: chains[3], bounds: { x: 1620, y: 0, width: 540, height: 960 }, viewport: VIEWPORT },
  5: { id: 5, title: titles[4], chain: chains[4], bounds: { x: 2160, y: 0, width: 540, height: 960 }, viewport: VIEWPORT },
  6: { id: 6, title: titles[5], chain: chains[5], bounds: { x: 2700, y: 0, width: 540, height: 960 }, viewport: VIEWPORT },
};

export function createAreaLayout(areaId: AreaId): AreaLayout {
  return AREA_LAYOUTS[areaId];
}

/** Return the world-space camera origin for an area. Keeping this derived from
 * the layout prevents UI selection, camera clamping, and native adapters from
 * inventing different area offsets. */
export function areaCameraOrigin(areaId: AreaId): Point {
  const layout = createAreaLayout(areaId);
  return { x: layout.bounds.x, y: layout.bounds.y };
}

export function clampCameraToArea(camera: Point, layout: AreaLayout): Point {
  const maxX = Math.max(layout.bounds.x, layout.bounds.x + layout.bounds.width - layout.viewport.width);
  const maxY = Math.max(layout.bounds.y, layout.bounds.y + layout.bounds.height - layout.viewport.height);
  return {
    x: Math.min(maxX, Math.max(layout.bounds.x, camera.x)),
    y: Math.min(maxY, Math.max(layout.bounds.y, camera.y)),
  };
}
