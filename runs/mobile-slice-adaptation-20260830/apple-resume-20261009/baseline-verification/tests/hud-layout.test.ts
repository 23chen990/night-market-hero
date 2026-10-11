import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('HUD uses stacked regions with reserved space for transient earnings', async () => {
  const css = await readFile('src/style.css', 'utf8');
  assert.match(css, /#earnings-banner\s*\{[\s\S]*top:\s*max\(112px/);
  assert.match(css, /#direction-text\s*\{[\s\S]*line-height/);
  assert.match(css, /#gate-legend\s*\{[\s\S]*top:\s*max\(58px/);
  assert.match(css, /\[hidden\]\s*\{[\s\S]*display:\s*none\s*!important/);
});
