import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
const root = resolve('runs/mobile-slice-adaptation-20260830');
const css = await readFile(resolve(root, 'workspace/prototype-a/src/style.css'), 'utf8');
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 844 }, { width: 1180, height: 720 }]) {
    const page = await browser.newPage({ viewport });
    await page.setContent(`<style>${css}</style><main id="game-shell"><aside id="tutorial-cue" data-cue="danger"><span id="tutorial-cue-icon">⚠</span><strong id="tutorial-cue-title">前方危险：尖刺</strong><small id="tutorial-cue-detail">抬高路线，及时翻转</small></aside></main>`);
    const rect = await page.locator('#tutorial-cue').boundingBox();
    results.push({ viewport, rect });
    assert.ok(rect && rect.y >= viewport.height * .7 && rect.y + rect.height <= viewport.height - 6, 'danger card must stay in its safe lower dock, away from center apple caps');
    await page.close();
  }
} finally { await browser.close(); await writeFile(resolve(root, 'apple-resume-20261009/tutorial-layout-result.json'), JSON.stringify(results, null, 2) + '\n'); }
console.log('tutorial safe dock passes all three viewports');
