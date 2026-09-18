import assert from 'node:assert/strict';
import { test } from 'node:test';
import { settlementCoins, comboMultiplier, depthCoefficient } from '../src/endless.ts';

test('结算公式：里程计费 floor(米数*0.12)', () => {
  // 仅里程，无拾取/坊门/连击
  assert.equal(settlementCoins({ distanceMeters: 1000, gates: 0, pickupCoins: 0 }), 120);
  assert.equal(settlementCoins({ distanceMeters: 100, gates: 0 }), 12);
});

test('结算公式：连击倍率作用拾取金币', () => {
  // 拾取10，combo=4 → 连击倍率=3 → 30
  assert.equal(settlementCoins({ distanceMeters: 0, gates: 0, pickupCoins: 10, combo: 4 }), 30);
  // combo=0 → 倍率1 → 10
  assert.equal(settlementCoins({ distanceMeters: 0, gates: 0, pickupCoins: 10, combo: 0 }), 10);
});

test('结算公式：深度系数作用拾取金币', () => {
  // 拾取10，combo=0，深度系数1.2 → 12
  assert.equal(settlementCoins({ distanceMeters: 0, gates: 0, pickupCoins: 10, combo: 0, depthMultiplier: 1.2 }), 12);
  // 深度系数与街区块公式一致（segment=11 → 1.2）
  assert.equal(settlementCoins({ distanceMeters: 0, gates: 0, pickupCoins: 10, combo: 0, depthMultiplier: depthCoefficient(11) }), 12);
});

test('结算公式：提灯童连击倍率上限为3', () => {
  // 普通角色 combo=99 → 倍率4 → 40
  assert.equal(settlementCoins({ distanceMeters: 0, gates: 0, pickupCoins: 10, combo: 99 }), 40);
  // 提灯童 combo=99 → 倍率3 → 30
  assert.equal(settlementCoins({ distanceMeters: 0, gates: 0, pickupCoins: 10, combo: 99, character: '提灯童' }), 30);
  assert.equal(comboMultiplier(99, '提灯童'), 3);
});

test('结算公式：0值边界与负值钳制', () => {
  assert.equal(settlementCoins({ gates: 0 }), 0);
  assert.equal(settlementCoins({ distanceMeters: 0, gates: 0, pickupCoins: 0, combo: 0 }), 0);
  // 负值不应产生负金币
  assert.equal(settlementCoins({ distanceMeters: -100, gates: -5, pickupCoins: -10 }), 0);
});

test('结算公式：三项合并', () => {
  // floor(1000*0.12)=120 + 10*3*1=30 + 2*8=16 = 166
  assert.equal(settlementCoins({ distanceMeters: 1000, gates: 2, pickupCoins: 10, combo: 4 }), 166);
});
