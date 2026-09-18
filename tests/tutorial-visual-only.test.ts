import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('first-level teaching is visual and mechanical, without instructional copy or blocking cards', async () => {
  const [html, main] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../src/main.ts', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(html, /tutorial-panel|布棚弹射|按住飞索抓挂点/);
  assert.match(html, /data-ui="tutorial-rail"/);
  assert.match(html, /data-tutorial-step="hook"/);
  assert.match(main, /grapple-attached-v1\.png/);
  assert.match(main, /safe-state-v1\.png/);
  assert.match(main, /tutorialPhase/);
  assert.match(main, /dataset\.tutorialPhase/);
  assert.doesNotMatch(main, /布棚救援/);
});
