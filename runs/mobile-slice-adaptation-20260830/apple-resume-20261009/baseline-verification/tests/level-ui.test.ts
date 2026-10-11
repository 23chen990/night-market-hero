import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { levelOnePrompt, PromptCueMemory, promptCue } from '../src/level-one-guidance';

test('LEVEL-UI-RED-001 placeholder shell exposes numbered selector, replay and next controls without final art decisions', async () => {
  const [html, main, css, theme] = await Promise.all([
    readFile('index.html', 'utf8'),
    readFile('src/main.ts', 'utf8'),
    readFile('src/style.css', 'utf8'),
    readFile('src/theme.ts', 'utf8'),
  ]);
  assert.match(html, /id="level-selector-toggle"/);
  assert.match(html, /id="level-grid"/);
  assert.match(html, /id="replay-button"/);
  assert.match(html, /id="next-level-button"/);
  assert.match(html, /id="bonus-test-button"/);
  assert.match(main, /LevelProgressStore/);
  assert.match(main, /selectLevel/);
  assert.match(main, /nextLevel/);
  assert.match(main, /replayLevel/);
  assert.match(main, /enterBonusChallenge/);
  assert.match(main, /before\.status === 'won'/);
  assert.match(css, /#level-select/);
  assert.match(css, /env\(safe-area-inset/);
  assert.match(theme, /status: z\.literal\('placeholder'\)/);
  assert.match(theme, /styleLock: z\.literal\(false\)/);
  assert.doesNotMatch(`${html}\n${css}`, /url\([^)]*\.(png|webp|jpg)/i);
});

test('LEVEL-UI-RED-002 Level 1 guidance stages the observed tutorial beats without copying reference wording', () => {
  assert.match(levelOnePrompt(1, 120, 'ready')!, /轻触|起跳/);
  assert.match(levelOnePrompt(1, 700, 'airborne')!, /连续|翻转/);
  assert.match(levelOnePrompt(1, 1450, 'airborne')!, /路线|阶梯/);
  assert.match(levelOnePrompt(1, 2050, 'airborne')!, /尖刺|危险/);
  assert.match(levelOnePrompt(1, 2750, 'airborne')!, /倍率|终点/);
  assert.equal(levelOnePrompt(2, 120, 'ready'), null);
});

test('LEVEL-UI-RED-003 exposes state-driven start, flight and danger cues', () => {
  assert.equal(promptCue(1, 120, 'ready', []).kind, 'start');
  assert.equal(promptCue(1, 700, 'airborne', []).kind, 'fly');
  assert.equal(promptCue(1, 2150, 'airborne', [{ x: 2400, collidable: true }]).kind, 'danger');
  assert.equal(promptCue(2, 120, 'ready', [{ x: 200, collidable: true }]).kind, 'none');
});

test('LEVEL-UI-RED-004 each tutorial cue appears once per run, then stays out of the playfield', () => {
  const memory = new PromptCueMemory();
  const start = promptCue(1, 120, 'ready', []);
  assert.equal(memory.resolve(start, 0)?.kind, 'start');
  assert.equal(memory.resolve(start, 500)?.kind, 'start', 'the first cue remains readable while the player is still ready');
  assert.equal(memory.resolve(start, 4_500)?.kind, 'start', 'slow first-load time must not hide the start cue');

  const fly = promptCue(1, 700, 'airborne', []);
  assert.equal(memory.resolve(fly, 4_600)?.kind, 'fly', 'the first tap hands the display to the flight cue');
  assert.equal(memory.resolve(promptCue(1, 700, 'anchored', []), 4_700)?.kind, 'fly', 'a landing in the same window must not erase the cue before it can be read');
  assert.equal(memory.resolve(fly, 6_500), null, 'the flight cue also appears only once');
  assert.equal(memory.resolve(start, 6_600), null, 'the start cue cannot return after the first tap');

  memory.reset();
  assert.equal(memory.resolve(start, 0)?.kind, 'start', 'a replay starts a fresh teaching run');
});

test('terminal actions honor the hidden attribute and labels use viewport visibility', async () => {
  const [html, css, layout] = await Promise.all([
    readFile('index.html', 'utf8'),
    readFile('src/style.css', 'utf8'),
    readFile('src/finish-label-layout.ts', 'utf8'),
  ]);
  assert.match(html, /id="terminal-actions" hidden/);
  assert.match(css, /\[hidden\][\s\S]*display:\s*none\s*!important/);
  assert.match(layout, /return null/);
  assert.doesNotMatch(layout, /clamp\(/);
});
