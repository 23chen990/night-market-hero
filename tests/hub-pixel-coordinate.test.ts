import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

test('reference-stage maps Hub UI assets to manifest pixel rectangles', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(html, /data-reference-stage="true"/);
  for (const [name, x, y, w, h] of [
    ['money', 576, 27, 183, 58], ['value', 656, 45, 83, 24], ['gate', 860, 27, 176, 58],
  ] as const) {
    const selector = name === 'money' ? 'hub-money' : name === 'value' ? 'hub-money-value' : 'hub-gate';
    const authoredX = name === 'value' ? 80 : x;
    const authoredY = name === 'value' ? 18 : y;
    assert.match(css, new RegExp(`\\.${selector}[\\s\\S]*${authoredX}px[\\s\\S]*${authoredY}px`));
    assert.ok(w > 0 && h > 0, `${name} mapped rect must be positive`);
  }
});

test('approved transparent Hub sources retain alpha and native money-value dimensions', async () => {
  for (const file of ['money-shell-transparent.png', 'gate-strip-transparent.png', 'money-value.png', 'anchor-button.png']) {
    const bytes = await readFile(new URL(`../src/assets/approved-runtime/hub/${file}`, import.meta.url));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  }
  const value = await readFile(new URL('../src/assets/approved-runtime/hub/money-value.png', import.meta.url));
  assert.deepEqual([value.readUInt32BE(16), value.readUInt32BE(20)], [79, 31]);
});
