import type { CustomerPhase, GameState, SpatialShopConfig } from './simulation.js';

export type ActiveOrderPresentation = {
  customerId: number | null;
  productId: string | null;
  productName: string;
  productColor: string;
  routeLabel: string;
  statusLabel: string;
  shelfStock: number;
  queueTicket: number | null;
  lines: Array<{ productId: string; productName: string; quantity: number; collected: number; outstanding: number; completed: boolean }>;
  basketValue: number;
  gatheredLabel: string;
};

const emptyOrder: ActiveOrderPresentation = {
  customerId: null,
  productId: null,
  productName: '暂无订单',
  productColor: '#D8F4E8',
  routeLabel: '等待顾客',
  statusLabel: '等待顾客',
  shelfStock: 0,
  queueTicket: null,
  lines: [],
  basketValue: 0,
  gatheredLabel: '暂无顾客',
};

function statusForPhase(phase: CustomerPhase): string {
  switch (phase) {
    case 'to-shelf': return '前往货架';
    case 'waiting-shelf': return '等待补货';
    case 'to-checkout': return '前往收银';
    case 'queued': return '排队待结算';
    case 'packing': return '打包中';
    case 'leaving': return '已完成';
    case 'left': return '已离店';
    default: return '等待顾客';
  }
}

export function getActiveOrderPresentation(config: SpatialShopConfig, state: GameState): ActiveOrderPresentation {
  const customer = state.customers
    .filter((candidate) => candidate.phase !== 'left' && candidate.phase !== 'leaving')
    .sort((left, right) => {
      const leftTicket = left.queueTicket ?? Number.MAX_SAFE_INTEGER;
      const rightTicket = right.queueTicket ?? Number.MAX_SAFE_INTEGER;
      return leftTicket - rightTicket || left.id - right.id;
    })[0];
  if (!customer) return { ...emptyOrder };

  const product = config.products.find((candidate) => candidate.id === customer.productId);
  const shelf = config.stations.find((candidate) => candidate.id === customer.targetShelfId);
  const shelfRuntime = state.stations[customer.targetShelfId];
  const shelfStock = shelfRuntime ? Object.values(shelfRuntime.stock).reduce((sum, count) => sum + count, 0) : 0;
  const lines = (customer.shoppingList ?? [{ productId: customer.productId, quantity: 1, collected: customer.basketValue > 0 ? 1 : 0, shelfId: customer.targetShelfId }]).map((line) => {
    const lineProduct = config.products.find((candidate) => candidate.id === line.productId);
    return {
      productId: line.productId,
      productName: lineProduct?.name ?? line.productId,
      quantity: line.quantity,
      collected: line.collected,
      outstanding: Math.max(0, line.quantity - line.collected),
      completed: line.collected >= line.quantity,
    };
  });
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  const collectedQuantity = lines.reduce((sum, line) => sum + line.collected, 0);
  return {
    customerId: customer.id,
    productId: customer.productId,
    productName: product?.name ?? customer.productId,
    productColor: product?.color ?? '#D8F4E8',
    routeLabel: shelf?.label ?? customer.targetShelfId,
    statusLabel: statusForPhase(customer.phase),
    shelfStock,
    queueTicket: customer.queueTicket,
    lines,
    basketValue: customer.basketValue,
    gatheredLabel: `${collectedQuantity}/${totalQuantity} 件已收集`,
  };
}
