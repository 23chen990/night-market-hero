import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { test } from 'node:test';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')) as {
  name?: string;
  version?: string;
  devDependencies?: Record<string, string>;
};

const lockPath = new URL('../package-lock.json', import.meta.url);

test('workspace manifest declares configuration imports directly', () => {
  assert.ok(packageJson.devDependencies?.['@eslint/js'], 'eslint.config.js requires a direct @eslint/js devDependency');
  assert.ok(packageJson.devDependencies?.['@types/node'], 'tsconfig.json requires a direct @types/node devDependency');
});

test('workspace lockfile records the manifest root and direct configuration dependencies', async () => {
  await access(lockPath);
  const lock = JSON.parse(await readFile(lockPath, 'utf8')) as {
    name?: string;
    version?: string;
    lockfileVersion?: number;
    packages?: Record<string, { devDependencies?: Record<string, string> }>;
  };
  assert.equal(lock.name, packageJson.name);
  assert.equal(lock.version, packageJson.version);
  assert.ok(lock.lockfileVersion && lock.lockfileVersion >= 3, 'npm lockfile v3 or newer is required for npm ci');
  assert.equal(lock.packages?.['']?.devDependencies?.['@eslint/js'], packageJson.devDependencies?.['@eslint/js']);
  assert.equal(lock.packages?.['']?.devDependencies?.['@types/node'], packageJson.devDependencies?.['@types/node']);
});
