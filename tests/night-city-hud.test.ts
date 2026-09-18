import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/style.css', import.meta.url), 'utf8');
const layout = await import('../src/hud-layout.ts');

test('live currency is the first visible coins selector and hides screenshot numerals', () => {
  const coinsMatches = [...html.matchAll(/data-ui="coins-total"/g)];
  assert.equal(coinsMatches.length, 1, 'one live currency node avoids a stale first-match target');
  const moneyStart = html.indexOf('<div class="hub-money"');
  assert.ok(moneyStart >= 0 && coinsMatches[0]!.index > moneyStart, 'live currency belongs to the money group');
  assert.match(html, /<span class="hub-money-number" data-ui="coins-total"[^>]*>0<\/span>/);
  assert.match(html, /<img class="hub-money-value"[^>]*hidden/);
  assert.match(css, /\.hub-money-value\s*\{[^}]*display:\s*none\s*!important/s);
});

test('one image pause control owns the pause action while compatibility markup stays hidden', () => {
  assert.equal((html.match(/data-action="pause"/g) ?? []).length, 2, 'one live action plus one hidden compatibility hook');
  assert.match(html, /<button class="hub-image-button hub-settings"[^>]*data-action="pause"/);
  assert.match(html, /<button class="pause-button"[^>]*data-action="pause"[^>]*hidden/);
  assert.match(css, /\.pause-button\s*\{[^}]*display:\s*none\s*!important/s);
});

test('gate frame and live values are separate from the legacy baked-number image', () => {
  assert.match(html, /data-hub="hub-gate-counter-frame"/);
  assert.match(html, /data-ui="gate-counter-frame"/);
  assert.match(html, /data-ui="gates-total"/);
  assert.match(html, /data-ui="gate-distance"/);
  assert.match(css, /\.hub-gate-strip\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(css, /\.hub-gate-count\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /\.hub-gate-distance\s*\{[^}]*font-size:/s);
});

test('reference HUD exports measured geometry and mobile touch target policy', () => {
  assert.deepEqual(layout.stage, { width: 1672, height: 941 });
  assert.deepEqual(layout.referenceHud.money, { x: 576, y: 27, width: 183, height: 58 });
  assert.deepEqual(layout.referenceHud.gate, { x: 860, y: 27, width: 176, height: 58 });
  assert.deepEqual(layout.referenceHud.destination, { x: 1301, y: 35, width: 198, height: 46 });
  assert.equal(layout.touchTargetMin, 44);
  for (const selector of ['.hub-back-key', '.hub-settings', '.item-button', '.ad-play-button']) {
    assert.match(css, new RegExp(`${selector.replace('.', '\\.')}` + '[^{]*\\{[^}]*min-(?:width|height):\\s*44px', 's'));
  }
});
