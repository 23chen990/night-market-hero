import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const manifest = await readFile(new URL('../docs/ART_ASSET_MANIFEST_V1.md', import.meta.url), 'utf8');

test('long-map art manifest covers all fifteen authored scene families', () => {
  for (const family of [
    'market-01/lantern-main-street', 'market-02/canopy-stall-lane', 'market-03/teahouse-signage', 'market-04/paifang-market-court',
    'transition/market-to-rooftops/climb-to-eaves',
    'rooftops-01/low-tile-ridges', 'rooftops-02/stepped-eaves', 'rooftops-03/cross-street-roof-bridge', 'rooftops-04/open-high-ridge',
    'transition/rooftops-to-waterfront/descent-to-canal',
    'waterfront-01/narrow-canal', 'waterfront-02/stone-bridge', 'waterfront-03/cargo-wharf', 'waterfront-04/lantern-boat-market',
    'transition/waterfront-to-market/canal-return-to-market',
  ]) assert.match(manifest, new RegExp(family.replaceAll('/', '\\/')));
});

test('manifest distinguishes approved reuse from missing and reference-only art', () => {
  assert.match(manifest, /AVAILABLE/);
  assert.match(manifest, /REUSE/);
  assert.match(manifest, /MISSING/);
  assert.match(manifest, /OPTIONAL/);
  assert.match(manifest, /LATER/);
  assert.match(manifest, /REFERENCE_AVAILABLE/);
  assert.match(manifest, /No new art generated: YES/);
  assert.match(manifest, /reference\/v04.*REFERENCE_AVAILABLE/s);
  assert.doesNotMatch(manifest, /reference\/v04[^\n]*production-approved/i);
});

test('manifest records transparency, canvas, transform, support, and occlusion fields', () => {
  for (const field of ['建议透明背景', '建议 nominal canvas size', '可否水平镜像', '是否允许缩放', '是否是钩锁支撑结构', '是否需要独立 pivot / mount point', '是否有动态版本', '遮挡要求']) {
    assert.match(manifest, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.match(manifest, /stall-canopy-v1\.png/);
  assert.match(manifest, /paifang-crossbeam-v1\.png/);
  assert.match(manifest, /waterfront\.stoneBridge/);
  assert.match(manifest, /rooftops\.highLanternSupportFrame/);
  assert.match(manifest, /rooftops\.crossStreetNegativeSpace/);
  assert.match(manifest, /rooftops\.darkCanopy/);
});

test('ambient and elastic-anchor requirements are listed without runtime implementation', () => {
  for (const item of ['普通路人', '挑担人', '推车人', '摊主', '搬货人', '靠栏站立人物', '乌篷船', '货船', '灯船']) {
    assert.match(manifest, new RegExp(item));
  }
  for (const item of ['lantern cable support', 'knot', 'lantern body', 'support beam', 'pivot']) {
    assert.match(manifest, new RegExp(item, 'i'));
  }
  assert.match(manifest, /Ambient runtime implemented: NO/);
  assert.match(manifest, /Elastic physics implemented: NO/);
});
