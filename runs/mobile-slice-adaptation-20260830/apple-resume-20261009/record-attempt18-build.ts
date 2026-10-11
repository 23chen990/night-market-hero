import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { z } from 'zod';

const root = resolve('runs/mobile-slice-adaptation-20260830');
const out = resolve(root, 'apple-resume-20261009');
const reviewWorkspace = resolve(root, 'workspace/apple-review-attempt18');
const digest = async (path: string) => createHash('sha256').update(await readFile(path)).digest('hex');
const defaultBuild = resolve(reviewWorkspace, 'dist/index.html');
const galleryBuild = resolve(reviewWorkspace, 'experiments/food-cleave/dist/index.html');
const snapshotPath = resolve(out, 'attempt18-source-snapshot.json');
const build = z.object({
  schemaVersion: z.literal(1),
  artifactType: z.literal('apple-attempt-build-binding'),
  attempt: z.literal(18),
  targetGame: z.literal('mobile-slice-adaptation-20260830'),
  reviewWorkspace: z.string(),
  sourceSnapshot: z.object({ path: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  builds: z.object({
    default: z.object({ path: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive() }).strict(),
    gallery: z.object({ path: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().positive() }).strict(),
  }).strict(),
  buildCount: z.literal(1),
  galleryBuildCount: z.literal(1),
  createdAt: z.string().datetime(),
}).strict().parse({
  schemaVersion: 1,
  artifactType: 'apple-attempt-build-binding',
  attempt: 18,
  targetGame: 'mobile-slice-adaptation-20260830',
  reviewWorkspace,
  sourceSnapshot: { path: snapshotPath, sha256: await digest(snapshotPath) },
  builds: {
    default: { path: defaultBuild, sha256: await digest(defaultBuild), bytes: (await readFile(defaultBuild)).byteLength },
    gallery: { path: galleryBuild, sha256: await digest(galleryBuild), bytes: (await readFile(galleryBuild)).byteLength },
  },
  buildCount: 1,
  galleryBuildCount: 1,
  createdAt: new Date().toISOString(),
});
await writeFile(resolve(out, 'attempt18-build-binding.json'), `${JSON.stringify(build, null, 2)}\n`);

const statePath = resolve(out, 'repair-state.json');
const state = JSON.parse(await readFile(statePath, 'utf8'));
await writeFile(statePath, `${JSON.stringify({
  ...state,
  status: 'BUILT_AWAITING_QA',
  buildCount: 1,
  galleryBuildCount: 1,
  reviewWorkspace,
  buildBinding: resolve(out, 'attempt18-build-binding.json'),
  updatedAt: new Date().toISOString(),
}, null, 2)}\n`);
console.log(JSON.stringify(build));
