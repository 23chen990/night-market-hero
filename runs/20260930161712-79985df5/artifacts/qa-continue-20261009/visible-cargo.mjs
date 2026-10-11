import { components, decode } from '../qa-retest-20261008/qa-lib-attempt8.mjs';

const colors = { 'fresh-fish': [75, 163, 199], kelp: [79, 138, 91], 'smoked-fish': [185, 121, 88] };

// Observes only the rendered product bars above the avatar. It never reads game state.
export function cargoFromPixels(png, player, landscape = false) {
  const image = decode(png);
  const counts = {};
  const bars = [];
  for (const [product, rgb] of Object.entries(colors)) {
    const candidates = components(image, rgb, 3, 3).map(c => ({
      ...c,
      world: landscape
        ? { x: c.y / image.h * 540, y: (1 - c.x / image.w) * 960 }
        : { x: c.x / image.w * 540, y: c.y / image.h * 960 },
    })).filter(c => Math.abs(c.world.x - player.x) < 18
      && c.world.y - player.y < -36 && c.world.y - player.y > -170);
    const rows = [];
    for (const candidate of candidates) {
      const offset = player.y - candidate.world.y;
      if (!rows.some(row => Math.abs(row - offset) < 5)) {
        rows.push(offset);
        bars.push({ product, offset, ...candidate });
      }
    }
    counts[product] = rows.length;
  }
  return { counts, total: Object.values(counts).reduce((a, b) => a + b, 0), bars };
}

export async function visibleCargo(driver) {
  const player = await driver.player();
  if (player.stoppedByOverlay) return { stoppedByOverlay: true, counts: {}, total: 0, bars: [] };
  const geometry = await driver.page.locator('#game canvas').evaluate(n => {
    const r = n.getBoundingClientRect();
    return { rect: { x: r.x, y: r.y, width: r.width, height: r.height }, landscape: document.body.classList.contains('is-landscape') };
  });
  const png = await driver.page.screenshot({ clip: geometry.rect, timeout: 30000, scale: 'css' });
  return { ...cargoFromPixels(png, player, geometry.landscape), player };
}
