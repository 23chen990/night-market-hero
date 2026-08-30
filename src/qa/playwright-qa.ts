import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import type { RuntimeAdapter } from '../adapters/runtime.js';
import type { QaReport } from '../schemas/index.js';

export async function runPlaywrightQa(runtime: RuntimeAdapter, workspace: string, runRoot: string): Promise<QaReport> {
  const preview = await runtime.startPreview(workspace); const consoleLines: string[] = []; const checks: QaReport['checks'] = []; const issues: QaReport['issues'] = []; const screenshot = path.join(runRoot, 'screenshots/gameplay.png');
  let browser;
  try {
    browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('console', (message) => { consoleLines.push(`[${message.type()}] ${message.text()}`); if (message.type() === 'error') issues.push({ id: `console-${issues.length + 1}`, severity: 'error', message: message.text(), evidence: 'console.log' }); });
    page.on('pageerror', (error) => issues.push({ id: `page-${issues.length + 1}`, severity: 'error', message: error.message, evidence: 'console.log' }));
    await page.goto(preview.url, { waitUntil: 'networkidle' }); await page.waitForFunction(() => Boolean((window as any).__GAME_TEST__));
    const result = await page.evaluate(() => { const api = (window as any).__GAME_TEST__; api.resetGame(); api.setRandomSeed(42); api.spawnCustomer(); const before = api.getState(); document.querySelector<HTMLButtonElement>('#produce')!.click(); const delivered = api.completeOrder(); api.grantCurrency(100); const upgraded = api.upgradeStation(); return { before, delivered, upgraded }; });
    checks.push({ name: 'deterministic-test-api', passed: result.before.randomSeed === 42, evidence: 'setRandomSeed(42) persisted deterministic state' });
    checks.push({ name: 'idle-shop-loop', passed: result.delivered.currency > result.before.currency && !result.delivered.customerWaiting, evidence: JSON.stringify(result.delivered) });
    checks.push({ name: 'upgrade-loop', passed: result.upgraded.level === 2, evidence: JSON.stringify(result.upgraded) });
    const canvasVisible = await page.locator('canvas').isVisible(); checks.push({ name: 'canvas-visible', passed: canvasVisible, evidence: 'Phaser canvas visible at 1280x900' });
    await page.screenshot({ path: screenshot, fullPage: true });
  } catch (error) { issues.push({ id: 'qa-runtime', severity: 'error', message: error instanceof Error ? error.message : String(error), evidence: 'Playwright execution' }); }
  finally { await browser?.close(); await preview.stop(); await runtime.stopPreview(); }
  for (const check of checks) if (!check.passed) issues.push({ id: `check-${issues.length + 1}`, severity: 'error', message: `${check.name} failed`, evidence: check.evidence });
  const consoleFile = path.join(runRoot, 'logs/console.log'); await writeFile(consoleFile, `${consoleLines.join('\n')}\n`);
  return { schemaVersion: 1, passed: issues.every((issue) => issue.severity !== 'error') && checks.length === 4, checks, issues, screenshots: ['screenshots/gameplay.png'], consoleLog: 'logs/console.log', testedAt: new Date().toISOString() };
}
