import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';

const stylePath = resolve('src/style.css');

test('escape distance feedback keeps its icon bounded to a compact overlay size', async () => {
  const css = await readFile(stylePath, 'utf8');
  const rule = css.match(/\.escape-feedback\s+img\s*\{([^}]*)\}/s)?.[1] ?? '';
  const width = Number(rule.match(/width:\s*(\d+)px/)?.[1] ?? 0);
  const height = Number(rule.match(/height:\s*(\d+)px/)?.[1] ?? 0);

  assert.ok(width > 0 && width <= 48, 'escape feedback icon width must be compact');
  assert.ok(height > 0 && height <= 48, 'escape feedback icon height must be compact');
});
