import { createHash } from 'node:crypto';
import { cp, lstat, mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { z } from 'zod';

const root = resolve('runs/mobile-slice-adaptation-20260830');
const canonical = resolve(root, 'workspace/prototype-a');
const review = resolve(root, 'workspace/apple-review-attempt18');
const out = resolve(root, 'apple-resume-20261009');
const entries = [
  '.DS_Store', 'attempt-9-test.log', 'docs', 'eslint.config.js', 'experiments', 'food-cleave.html',
  'index.html', 'package.json', 'pnpm-lock.yaml', 'poc-3d.html', 'public', 'reference-evidence',
  'scripts', 'src', 'tests', 'tsconfig.json', 'vite.config.ts', 'watermelon-cleave.html',
];

if (await lstat(review).catch(() => null)) throw new Error(`Review workspace already exists: ${review}`);
await mkdir(review, { recursive: true });
for (const entry of entries) {
  const source = resolve(canonical, entry);
  if (await lstat(source).catch(() => null)) await cp(source, resolve(review, entry), { recursive: true, preserveTimestamps: true });
}
await symlink(resolve(canonical, 'node_modules'), resolve(review, 'node_modules'));

const hashes: Record<string, string> = {};
async function collect(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.isFile()) hashes[relative(review, path)] = createHash('sha256').update(await readFile(path)).digest('hex');
  }
}
await collect(review);

const manifest = z.object({
  schemaVersion: z.literal(1),
  artifactType: z.literal('apple-attempt-source-snapshot'),
  attempt: z.literal(18),
  targetGame: z.literal('mobile-slice-adaptation-20260830'),
  canonicalWorkspace: z.string(),
  reviewWorkspace: z.string(),
  purpose: z.string(),
  sources: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)),
  createdAt: z.string().datetime(),
}).strict().parse({
  schemaVersion: 1,
  artifactType: 'apple-attempt-source-snapshot',
  attempt: 18,
  targetGame: 'mobile-slice-adaptation-20260830',
  canonicalWorkspace: canonical,
  reviewWorkspace: review,
  purpose: 'Immutable attempt18 repair input; build and player evidence must bind only to this workspace.',
  sources: hashes,
  createdAt: new Date().toISOString(),
});
await writeFile(resolve(out, 'attempt18-source-snapshot.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ reviewWorkspace: review, sourceFiles: Object.keys(hashes).length }));
