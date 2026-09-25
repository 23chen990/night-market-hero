import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ExpansionDesignProposalSchema } from './expansion-design-proposal.schema.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const inputPath = join(root, 'expansion-design-proposal.json');
const outputPath = join(root, 'expansion-design-proposal.validation.json');
const source = readFileSync(inputPath);
const parsed = ExpansionDesignProposalSchema.safeParse(JSON.parse(source.toString('utf8')));
const validation = parsed.success
  ? {
      schemaVersion: 1,
      valid: true,
      validator: 'zod-strict',
      schemaFile: 'expansion-design-proposal.schema.mjs',
      artifactFile: 'expansion-design-proposal.json',
      artifactSha256: createHash('sha256').update(source).digest('hex'),
      topLevelUnknownKeysRejected: true,
      validatedAt: new Date().toISOString(),
      issues: [],
    }
  : {
      schemaVersion: 1,
      valid: false,
      validator: 'zod-strict',
      schemaFile: 'expansion-design-proposal.schema.mjs',
      artifactFile: 'expansion-design-proposal.json',
      artifactSha256: createHash('sha256').update(source).digest('hex'),
      topLevelUnknownKeysRejected: true,
      validatedAt: new Date().toISOString(),
      issues: parsed.error.issues,
    };
writeFileSync(outputPath, `${JSON.stringify(validation, null, 2)}\n`);
if (!parsed.success) {
  console.error(JSON.stringify(validation, null, 2));
  process.exit(1);
}
console.log(JSON.stringify(validation, null, 2));

