import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ingestReferenceMedia } from '../../src/core/evidence-provenance.js';
import { isReferenceWebCapturePath } from '../../src/schemas/reference-web-capture.js';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function runWithIndex() {
  const runRoot = await mkdtemp(path.join(tmpdir(), 'evidence-ingest-option-'));
  roots.push(runRoot);
  const sourcePath = path.join(runRoot, 'reference-web-capture.json');
  await writeFile(sourcePath, '{"artifactType":"reference-web-capture"}\n');
  return { runRoot, sourcePath };
}

describe('reference media ingest analysis option', () => {
  it('ingests a capture index as pending evidence without an analysis sidecar', async () => {
    const { runRoot, sourcePath } = await runWithIndex();
    const result = await ingestReferenceMedia({ sourcePath, runRoot, targetGame: 'g', purpose: 'gameplay-reference', analysisText: false });
    expect(result.analysisTextPath).toBeUndefined();
    const manifest = JSON.parse(await readFile(path.join(runRoot, 'reference-evidence/manifest.json'), 'utf8'));
    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0].analysisTextPath).toBeUndefined();
    expect(manifest.entries[0].reviewStatus).toBe('PENDING');
    expect(manifest.entries[0].usableAsEvidence).toBe(false);
    expect(isReferenceWebCapturePath(manifest.entries[0].storedPath)).toBe(true);
  });

  it('still writes an analysis sidecar for json when the option is omitted', async () => {
    const { runRoot, sourcePath } = await runWithIndex();
    const result = await ingestReferenceMedia({ sourcePath, runRoot, targetGame: 'g', purpose: 'gameplay-reference' });
    expect(result.analysisTextPath).toMatch(/\.analysis\.txt$/u);
    const manifest = JSON.parse(await readFile(path.join(runRoot, 'reference-evidence/manifest.json'), 'utf8'));
    expect(manifest.entries[0].analysisTextPath).toBe(result.analysisTextPath);
  });
});
