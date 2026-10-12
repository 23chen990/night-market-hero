import type Phaser from 'phaser';
import type { GrappleState } from './game-core.ts';

/** All ride graphics share world coordinates with the actual mount/pivot. */
export function drawRide(g: Phaser.GameObjects.Graphics, state: GrappleState): void {
  if (!state.vehicleId || state.vehicleTicksRemaining <= 0) return;
  const { x, y } = state.player;
  const wave = Math.sin(state.tick / 14);
  if (state.vehicleId === '纸鸢') {
    const cy = y - 144;
    g.lineStyle(3, 0xffdfa0, 0.95); g.lineBetween(x, cy + 70, x, y + 2);
    g.fillStyle(0xf0b856, 1); g.fillTriangle(x, cy - 65, x - 83, cy + 8, x, cy + 75);
    g.fillStyle(0xd87651, 1); g.fillTriangle(x, cy - 65, x + 83, cy + 8, x, cy + 75);
    g.lineStyle(4, 0xffefb7, 1); g.lineBetween(x - 83, cy + 8, x + 83, cy + 8); g.lineBetween(x, cy - 65, x, cy + 75);
    g.lineStyle(5, 0xe0aa69, 0.9); g.lineBetween(x - 69, cy + 23, x - 92 + wave * 13, cy + 85); g.lineBetween(x + 69, cy + 23, x + 92 + wave * 13, cy + 85);
  } else if (state.vehicleId === '货运滑索') {
    const cableY = state.vehicleLockY - 96;
    g.lineStyle(5, 0x213b46, 0.96); g.lineBetween(x - 850, cableY, x + 1150, cableY - 30);
    g.lineStyle(2, 0xfadf99, 1); g.lineBetween(x - 850, cableY - 5, x + 1150, cableY - 35);
    g.fillStyle(0xd4a458, 1); g.fillCircle(x, cableY - 13, 20);
    g.lineStyle(5, 0xffe6a0, 1); g.strokeCircle(x, cableY - 13, 20); g.lineBetween(x, cableY + 7, x, y + 10);
    g.fillStyle(0x536e75, 1); g.fillRoundedRect(x - 46, y + 15, 92, 45, 8);
    g.lineStyle(4, 0xe2b572, 1); g.strokeRect(x - 46, y + 15, 92, 45);
  } else if (state.vehicleId === '灯笼群') {
    const pivot = state.vehicleVirtualAnchor ?? { x, y: y - 160 };
    g.lineStyle(3, 0xffd89b, 0.9); g.lineBetween(pivot.x, pivot.y, x, y + 4);
    for (let index = -2; index <= 2; index++) {
      const lx = pivot.x + index * 35, ly = pivot.y - 40 - (2 - Math.abs(index)) * 20 + wave * 4;
      g.lineStyle(2, 0xd1a478, 1); g.lineBetween(lx, ly + 27, pivot.x, pivot.y);
      g.fillStyle(0xe38a55, 0.97); g.fillRoundedRect(lx - 15, ly - 22, 30, 42, 10);
      g.lineStyle(3, 0xffe3a1, 1); g.lineBetween(lx - 12, ly - 22, lx + 12, ly - 22); g.lineBetween(lx - 12, ly + 19, lx + 12, ly + 19);
      g.lineStyle(2, 0xffd788, 1); g.lineBetween(lx, ly + 20, lx, ly + 32);
    }
  } else {
    const cy = y + 29, lift = state.vehiclePhase === 'holding' ? wave * 25 : -18;
    g.fillStyle(0x55c3be, 1);
    g.fillTriangle(x - 5, cy, x - 118, cy - 46 + lift, x - 62, cy + 22);
    g.fillTriangle(x + 14, cy, x + 122, cy - 48 + lift, x + 73, cy + 27);
    g.fillStyle(0x347e97, 1); g.fillEllipse(x, cy + 10, 104, 40);
    g.fillStyle(0xb4f0cf, 1); g.fillEllipse(x + 44, cy - 9, 40, 38);
    g.fillStyle(0xefcd83, 1); g.fillTriangle(x + 60, cy - 12, x + 84, cy - 4, x + 59, cy + 2);
    g.fillStyle(0x122e42, 1); g.fillCircle(x + 50, cy - 14, 4);
    g.lineStyle(6, 0x71d7d0, 0.9); g.lineBetween(x - 42, cy + 18, x - 110, cy + 52); g.lineBetween(x - 35, cy + 20, x - 92, cy + 65);
  }
}

export function drawConditions(g: Phaser.GameObjects.Graphics, state: GrappleState, left: number, width: number, reducedMotion: boolean): void {
  if (state.mutation === '下雨') {
    g.lineStyle(2, 0xbed5db, 0.26);
    for (let i = 0; i < 28; i++) {
      const x = left + (i * 173 + (reducedMotion ? 0 : state.tick * 1.1)) % width;
      const y = (i * 107 + (reducedMotion ? 0 : state.tick * 8)) % 930;
      g.lineBetween(x, y, x - 12, y + 29);
    }
  }
  if (state.mutation === '起雾') {
    for (let i = 0; i < 5; i++) { g.fillStyle(0xc8e0de, 0.035); g.fillRect(left, 470 + i * 42, width, 45); }
  }
  if (state.isSky) {
    g.fillStyle(0xbce4eb, 0.5);
    for (let i = 0; i < 16; i++) g.fillCircle(left + (i * 173) % width, 95 + i % 4 * 36, i % 3 === 0 ? 3 : 2);
  }
}

/** Player must physically fly through this world-space lane to collect a ride. */
export function drawVehicleOffers(g: Phaser.GameObjects.Graphics, state: GrappleState): void {
  for (const offer of state.vehicleOffers ?? []) {
    if (offer.status !== 'available') continue;
    const pulse = 0.5 + 0.5 * Math.sin(state.tick / 16);
    const x = offer.x, y = offer.y;
    const theme = offer.id === '青鸾' ? 0x79e6ce : offer.id === '纸鸢' ? 0xf5d27e
      : offer.id === '灯笼群' ? 0xffaa7c : 0xf1cf91;
    g.fillStyle(theme, 0.04 + pulse * 0.04).fillEllipse(x, y, 170, 460);
    g.lineStyle(12, theme, 0.12).strokeEllipse(x, y, 160, 455);
    g.lineStyle(5, theme, 0.65 + pulse * 0.30).strokeEllipse(x, y, 132, 432);
    g.lineStyle(2, 0xfff4ce, 0.85).strokeEllipse(x, y, 100, 380);
    // A grounded pickup pole makes the ring part of the landscape rather
    // than a HUD notification or invisible segment-transition reward.
    g.lineStyle(4, 0x9a8065, 0.70).lineBetween(x, y + 230, x, 772);
    // Preview the actual vehicle in the collision lane. An anonymous ring
    // cannot explain why touching it suddenly changes the rider's controls.
    g.fillStyle(0x16252b, 0.82).fillCircle(x, y, 44);
    g.lineStyle(3, theme, 0.94).strokeCircle(x, y, 43);
    if (offer.id === '纸鸢') {
      g.fillStyle(theme, 1).fillTriangle(x, y - 31, x - 34, y + 1, x, y + 19);
      g.fillStyle(0xe78757, 1).fillTriangle(x, y - 31, x + 34, y + 1, x, y + 19);
      g.lineStyle(3, 0xffedc6, 0.94).lineBetween(x, y - 31, x, y + 32);
    } else if (offer.id === '货运滑索') {
      g.lineStyle(5, 0xffebbd, 1).lineBetween(x - 33, y - 23, x + 33, y - 29);
      g.fillStyle(theme, 1).fillCircle(x, y - 24, 8);
      g.lineStyle(3, theme, 1).lineBetween(x, y - 17, x, y + 5);
      g.fillStyle(0xc98f58, 1).fillRoundedRect(x - 25, y + 5, 50, 25, 5);
      g.lineStyle(2, 0xffebbd, 1).strokeRect(x - 24, y + 6, 48, 23);
    } else if (offer.id === '灯笼群') {
      g.lineStyle(2, 0xffefce, 1).lineBetween(x - 35, y - 22, x + 35, y - 22);
      for (let n = -1; n <= 1; n++) {
        const lx = x + n * 25;
        g.lineStyle(2, theme, 1).lineBetween(lx, y - 22, lx, y - 12);
        g.fillStyle(n === 0 ? 0xffcf74 : 0xe99959, 1).fillRoundedRect(lx - 10, y - 12, 20, 34, 7);
        g.lineStyle(2, 0xffedbe, 1).lineBetween(lx - 7, y + 10, lx + 7, y + 10);
      }
    } else {
      g.fillStyle(theme, 1).fillTriangle(x, y - 7, x - 38, y - 20, x - 17, y + 27);
      g.fillTriangle(x, y - 7, x + 38, y - 20, x + 17, y + 27);
      g.fillStyle(0xffefc0, 1).fillEllipse(x, y + 9, 25, 39);
      g.fillTriangle(x, y + 24, x - 13, y + 36, x + 13, y + 36);
    }
  }
}
