import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { resolve } from 'node:path';
import ts from 'typescript';

function containsTopLevelAwait(source: string): boolean {
  const sourceFile = ts.createSourceFile('main.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node: ts.Node): boolean => {
    if (ts.isAwaitExpression(node)) return true;
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) return false;
    let found = false;
    node.forEachChild((child) => { found ||= visit(child); });
    return found;
  };
  return sourceFile.statements.some(visit);
}

test('build is a self-contained immediately playable 夜市飞侠 formal QA page', async () => {
  const html = await readFile(resolve('dist/index.html'), 'utf8').catch(() => '');
  assert.ok(html.length > 100_000, 'expected bundled Phaser build');
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=/i);
  assert.doesNotMatch(html, /<script[^>]*\btype=["']module["']/i,
    'the self-contained package must execute as a classic inlined script');
  assert.ok(html.indexOf('<script>') > html.indexOf('</main>'),
    'the classic inline bootstrap must run after the application markup exists');
  assert.match(html, /data-action=["']grapple["']/);
  assert.match(html, /__PROTOTYPE_TEST__/);
  assert.match(html, /__GAME_TEST__/);
  assert.match(html, /__FORMAL_TEST__/);
  assert.match(html, /夜市飞侠：护印突围/);
  assert.match(html, /护印突围/);
  assert.match(html, /盟契铜符/);
  assert.match(html, /按住飞索挂接地形节点并借力，松手保留动量/);
  assert.match(html, /官兵/);
  assert.match(html, /坊门关闭前/);
  assert.match(html, /data-ui=["']pursuer["']/);
  assert.match(html, /看完广告 · 安全复起/);
  assert.match(html, /看完广告 · 再得/);
  const visibleMarkup = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  assert.doesNotMatch(visibleMarkup, /banner/i);
});

test('build exposes an unambiguous double-click playable alias', async () => {
  const html = await readFile(resolve('夜市飞侠-护印突围-试玩版.html'), 'utf8').catch(() => '');
  assert.ok(html.length > 100_000, 'expected the playable alias to contain the bundled game');
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=/i);
  assert.doesNotMatch(html, /<script[^>]*\btype=["']module["']/i);
  assert.match(html, /__PROTOTYPE_TEST__/);
  assert.match(html, /data-ui=["']pursuer["']/);
});

test('source bootstraps asynchronously without top-level await and publishes APIs only after preload', async () => {
  const source = await readFile(resolve('src/main.ts'), 'utf8');
  assert.equal(containsTopLevelAwait(source), false, 'classic-script entry cannot contain top-level await');
  assert.match(source, /async function bootstrap\(\): Promise<void>/);
  const bootstrapStart = source.indexOf('async function bootstrap(): Promise<void>');
  const preload = source.indexOf('await uiMotion.preload', bootstrapStart);
  const prototypeApi = source.indexOf('window.__PROTOTYPE_TEST__ =', bootstrapStart);
  const formalApi = source.indexOf('window.__FORMAL_TEST__ =', bootstrapStart);
  assert.ok(preload > bootstrapStart, 'bootstrap must await UI preload');
  assert.ok(prototypeApi > preload, 'prototype API must not exist before preload succeeds');
  assert.ok(formalApi > preload, 'formal API must not exist before preload succeeds');
  assert.match(source, /void bootstrap\(\)\.catch\(/,
    'bootstrap failures must be observed without requiring top-level await');
});

test('browser smoke records all three vertical closing-gate beat screenshots', async () => {
  const source = await readFile(resolve('tests/browser-smoke.ts'), 'utf8');
  for (const beat of [1, 2, 3]) {
    assert.match(source, new RegExp(`closing-gate-beat-${beat}\\.png`));
  }
  assert.match(source, /topLeafBounds/);
  assert.match(source, /bottomLeafBounds/);
  assert.match(source, /VERTICAL_DOUBLE_LEAVES_INWARD/);
  assert.match(source, /frozenGateState\.status, 'playing'/);
  assert.match(source, /pauseButton\.click\(\)/);
  assert.match(source, /closing-gate-collision\.png/,
    'browser smoke must capture a real normal-traversal leaf collision');
  assert.match(source, /closing-gate-aperture-victory\.png/,
    'browser smoke must capture the valid beat-3 live-aperture victory');
});
