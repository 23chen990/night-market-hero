import { existsSync, readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';

type DecodedPng = { width: number; height: number; alpha: Uint8Array };

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function paeth(left: number, above: number, upperLeft: number) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function decodeRgbaPng(path: URL): DecodedPng {
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 8).equals(PNG_SIGNATURE), `${path.pathname} must be a real PNG`).toBe(true);
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  const idat: Buffer[] = [];
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      expect(data[8], 'PNG must use 8-bit channels').toBe(8);
      colorType = data[9]!;
      expect(data[12], 'interlaced PNGs are not accepted by the texture contract').toBe(0);
    } else if (type === 'IDAT') idat.push(data);
    offset += length + 12;
  }
  expect(colorType, `${path.pathname} must be encoded as RGBA`).toBe(6);
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const decoded = Buffer.alloc(stride * height);
  let input = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[input++]!;
    for (let x = 0; x < stride; x += 1) {
      const source = raw[input++]!;
      const current = y * stride + x;
      const left = x >= 4 ? decoded[current - 4]! : 0;
      const above = y > 0 ? decoded[current - stride]! : 0;
      const upperLeft = y > 0 && x >= 4 ? decoded[current - stride - 4]! : 0;
      if (filter === 0) decoded[current] = source;
      else if (filter === 1) decoded[current] = (source + left) & 255;
      else if (filter === 2) decoded[current] = (source + above) & 255;
      else if (filter === 3) decoded[current] = (source + Math.floor((left + above) / 2)) & 255;
      else if (filter === 4) decoded[current] = (source + paeth(left, above, upperLeft)) & 255;
      else throw new Error(`Unsupported PNG filter ${filter}`);
    }
  }
  const alpha = new Uint8Array(width * height);
  for (let pixel = 0; pixel < alpha.length; pixel += 1) alpha[pixel] = decoded[pixel * 4 + 3]!;
  return { width, height, alpha };
}

const config = JSON.parse(readFileSync(new URL('../src/generated/game-config.json', import.meta.url), 'utf8')) as {
  assets: Record<'background' | 'character' | 'fish' | 'kelp' | 'upgrade' | 'otterWalkFront' | 'otterWalkBack' | 'otterWalkSide', string>;
};

describe('production texture assets', () => {
  it('ships fixed-size RGBA PNGs at every manifest path', () => {
    const expectedSizes = {
      background: [960, 540],
      character: [256, 256],
      fish: [256, 256],
      kelp: [256, 256],
      upgrade: [256, 256],
      otterWalkFront: [2048, 256],
      otterWalkBack: [2048, 256],
      otterWalkSide: [2048, 256],
    } as const;
    for (const [key, relativePath] of Object.entries(config.assets)) {
      expect(relativePath.endsWith('.png'), `${key} must not depend on runtime SVG rasterization`).toBe(true);
      const publicPath = new URL(`../public/${relativePath.replace(/^\.\//, '')}`, import.meta.url);
      expect(existsSync(publicPath), `${key} is missing at ${publicPath.pathname}`).toBe(true);
      const png = decodeRgbaPng(publicPath);
      expect([png.width, png.height]).toEqual(expectedSizes[key as keyof typeof expectedSizes]);
    }
  });

  it('keeps the background opaque and every foreground texture meaningfully transparent', () => {
    for (const [key, relativePath] of Object.entries(config.assets)) {
      const publicPath = new URL(`../public/${relativePath.replace(/^\.\//, '')}`, import.meta.url);
      const { alpha } = decodeRgbaPng(publicPath);
      const transparent = alpha.reduce((count, value) => count + Number(value === 0), 0) / alpha.length;
      const visible = alpha.reduce((count, value) => count + Number(value > 0), 0) / alpha.length;
      if (key === 'background') {
        expect(visible).toBe(1);
      } else {
        expect(transparent, `${key} needs a real transparent surround`).toBeGreaterThan(0.08);
        expect(visible, `${key} must contain visible art`).toBeGreaterThan(0.08);
      }
    }
  });

  it('keeps meaningful alpha independently in every character animation frame', () => {
    for (const key of ['otterWalkFront', 'otterWalkBack', 'otterWalkSide'] as const) {
      const relativePath = config.assets[key];
      const publicPath = new URL(`../public/${relativePath.replace(/^\.\//, '')}`, import.meta.url);
      expect(existsSync(publicPath), `${key} atlas is missing`).toBe(true);
      const { width, alpha } = decodeRgbaPng(publicPath);
      for (let frame = 0; frame < 8; frame += 1) {
        let transparent = 0;
        let visible = 0;
        for (let y = 0; y < 256; y += 1) {
          for (let x = frame * 256; x < (frame + 1) * 256; x += 1) {
            const value = alpha[y * width + x]!;
            transparent += Number(value === 0);
            visible += Number(value > 0);
          }
        }
        const pixels = 256 * 256;
        expect(transparent / pixels, `${key} frame ${frame} needs transparent surround`).toBeGreaterThan(0.08);
        expect(visible / pixels, `${key} frame ${frame} must contain visible art`).toBeGreaterThan(0.08);
      }
    }
  });
});
