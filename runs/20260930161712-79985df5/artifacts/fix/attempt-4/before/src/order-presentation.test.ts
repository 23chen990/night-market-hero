import { describe, expect, it } from 'vitest';
import generatedConfig from './generated/game-config.json';
import { createInitialState, type SpatialShopConfig } from './simulation.js';
import { getActiveOrderPresentation } from './order-presentation.js';

const shop = generatedConfig.spatialShop as SpatialShopConfig;

describe('active order presentation', () => {
  it('exposes the requested product, route, status and shelf context', () => {
    const state = createInitialState(shop);
    state.customers = [{
      id: 1,
      x: 270,
      y: 420,
      phase: 'waiting-shelf',
      productId: 'fresh-fish',
      targetShelfId: 'fish-shelf',
      patienceRemainingMs: shop.customers.patienceMs,
      basketValue: 0,
      queuePosition: null,
      queueTicket: null,
    }];
    state.stations['fish-shelf']!.stock['fresh-fish'] = 2;

    const order = getActiveOrderPresentation(shop, state);

    expect(order.productId).toBe('fresh-fish');
    expect(order.productName).toBe('鲜鱼');
    expect(order.productColor).toBe('#4BA3C7');
    expect(order.routeLabel).toBe('鲜鱼冰盘');
    expect(order.statusLabel).toBe('等待补货');
    expect(order.shelfStock).toBe(2);
  });

  it('returns an explicit empty order state when no customer is active', () => {
    const order = getActiveOrderPresentation(shop, createInitialState(shop));

    expect(order.customerId).toBeNull();
    expect(order.productName).toBe('暂无订单');
    expect(order.statusLabel).toBe('等待顾客');
  });
});
