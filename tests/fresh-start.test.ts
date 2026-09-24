import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('fresh launch query clears the persisted run before bootstrap can restore it', async () => {
  const source = await readFile('src/main.ts', 'utf8');
  assert.match(source, /const freshStart = query\.get\('fresh'\) === '1'/);
  assert.match(source, /if \(freshStart\) runSnapshotStorage\.clear\(\)/);
  assert.match(source, /const candidateRun = freshStart \? null : runSnapshotStorage\.load\(\)/);
});
