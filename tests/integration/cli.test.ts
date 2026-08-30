import { execFile } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';

const exec = promisify(execFile);
it('CLI validates a seed with a machine-readable success result', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'factory-cli-'));
  const seed = path.join(root, 'seed.yaml');
  await writeFile(seed, 'title: Test\ntheme: spirits\ntemplate: idle-shop-v1\n');
  const result = await exec('pnpm', ['factory', 'validate', seed], { cwd: process.cwd(), env: { ...process.env, FACTORY_ROOT: root } });
  expect(JSON.parse(result.stdout)).toMatchObject({ valid: true });
});
