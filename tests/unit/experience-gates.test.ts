import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { buildCompletionGateReport } from '../../src/qa/experience-gates.js';

it('automatically records visual, level-difference, and human gates without allowing missing evidence to pass', async () => {
  const runRoot = await mkdtemp(path.join(tmpdir(), 'experience-gates-'));
  await mkdir(path.join(runRoot, 'screenshots'), { recursive: true });
  await writeFile(path.join(runRoot, 'screenshots/a.png'), 'a');
  await writeFile(path.join(runRoot, 'screenshots/b.png'), 'b');
  const report = await buildCompletionGateReport({ runRoot, corePassed: true, normalFlowPassed: true, screenshots: ['screenshots/a.png', 'screenshots/b.png'] });
  expect(report.candidateReady).toBe(false);
  expect(report.blockers).toEqual(['levelDifference', 'humanPlaytest']);
});
