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
    // A held lantern rope is tied to a physical world pivot. Released lanterns
    // visibly fly with the hero; no invented support follows the player.
    const pivot = state.vehicleVirtualAnchor;
    if (pivot) {
      g.lineStyle(3, 0xffd89b, 0.9); g.lineBetween(pivot.x, pivot.y, x, y + 4);
    }
    for (let index = -2; index <= 2; index++) {
      const lx = (pivot?.x ?? x) + index * 35;
      const ly = pivot
        ? pivot.y + Math.min(155, Math.max(50, state.vehicleLockY * .65)) - (2 - Math.abs(index)) * 14 + wave * 4
        : y - 68 - (2 - Math.abs(index)) * 8 + wave * 4;
      if (pivot) g.lineStyle(2, 0xd1a478, 1).lineBetween(lx, ly - 22, pivot.x, pivot.y);
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

/** One visible interactive target for each actual world-support. */
export function drawVehicleOffers(g: Phaser.GameObjects.Graphics, state: GrappleState): void {
  for (const offer of state.vehicleOffers ?? []) {
    if (offer.status !== 'available') continue;
    // Keep each encounter on its authored building support. The line and
    // terminal ring are diegetic parts of the scene, not a large invisible
    // trigger placed on top of the player.
    const x = offer.x, y = offer.y;
    const rx = offer.radiusX ?? 100, ry = offer.radiusY ?? 180;
    const pulse = 0.5 + 0.5 * Math.sin(state.tick / 16);
    const color = offer.id === '青鸾' ? 0x7ce9d9 : offer.id === '纸鸢' ? 0xf1d883
      : offer.id === '灯笼群' ? 0xfa9f75 : 0xf3ce89;
    if (offer.supportX !== undefined && offer.supportY !== undefined) {
      g.lineStyle(4, 0xc9aa7b, 0.76).lineBetween(offer.supportX, offer.supportY, x, y - ry * 0.6);
      g.fillStyle(0xffe9aa, 0.92).fillCircle(offer.supportX, offer.supportY, 8);
    }
    // Only the INNER solid ellipse is collidable; glow outside is visual.
    g.fillStyle(color, 0.13 + pulse * 0.05).fillEllipse(x, y, rx * 2, ry * 2);
    g.lineStyle(4, color, 0.7 + pulse * 0.2).strokeEllipse(x, y, rx * 2, ry * 2);
    g.lineStyle(2, 0xfff4d9, 0.95).strokeEllipse(x, y, rx * 1.73, ry * 1.73);
    if (offer.id === '货运滑索') {
      // Pulley, bearing and downward hanging hook.
      g.lineStyle(6, 0x725744, 1).lineBetween(x - 26, y - 23, x + 26, y - 23);
      g.fillStyle(0xf5cc7e, 1).fillCircle(x, y - 19, 20);
      g.fillStyle(0x4c3940, 1).fillCircle(x, y - 19, 8);
      g.lineStyle(6, 0xffe9a8, 1).lineBetween(x, y - 1, x, y + 30);
      g.lineStyle(6, 0xffe9a8, 1).strokeCircle(x + 11, y + 32, 11);
    } else if (offer.id === '纸鸢') {
      // Traditional sail with a reachable handle underneath.
      g.fillStyle(0xecc277, 0.94).fillTriangle(x, y - 52, x - 45, y - 6, x, y + 4);
      g.fillStyle(0xe08d64, 0.96).fillTriangle(x, y - 52, x + 45, y - 6, x, y + 4);
      g.lineStyle(3, 0xfff4c7, 1).lineBetween(x, y - 45, x, y + 24);
      g.lineStyle(6, 0xfff4c7, 1).lineBetween(x - 17, y + 26, x + 17, y + 26);
    } else if (offer.id === '灯笼群') {
      // A physical cross-cable knot with lanterns on either side.
      g.lineStyle(4, 0xf5be91, 1).lineBetween(x - 46, y - 24, x + 46, y - 24);
      for (const ox of [-32, 32]) {
        g.fillStyle(0xe77c51, 0.98).fillEllipse(x + ox, y + 4, 28, 38);
        g.lineStyle(2, 0xffe2ab, 1).strokeEllipse(x + ox, y + 4, 28, 38);
        g.lineStyle(2, 0xffc58f, 0.85).lineBetween(x + ox, y - 24, x + ox, y - 16);
      }
      g.fillStyle(0xfff3cf, 1).fillCircle(x, y - 24, 11);
    } else {
      // High bird silhouette and two graspable trailing streamers.
      g.fillStyle(0x92efdc, 0.95).fillTriangle(x, y - 22, x - 65, y - 12, x - 12, y + 9);
      g.fillTriangle(x, y - 22, x + 65, y - 12, x + 12, y + 9);
      g.fillStyle(0xffebad, 0.98).fillCircle(x, y - 22, 14);
      g.lineStyle(3, 0x81dec8, 0.91).lineBetween(x, y - 5, x - 29, y + 46);
      g.lineBetween(x, y - 5, x + 29, y + 46);
    }
  }
}
