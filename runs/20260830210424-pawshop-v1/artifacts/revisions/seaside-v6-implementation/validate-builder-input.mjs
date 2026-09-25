import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BuilderInputSchema } from './builder-input.schema.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(root, 'builder-input.json'));
const result = BuilderInputSchema.safeParse(JSON.parse(source.toString('utf8')));
const output = {
  schemaVersion: 1,
  valid: result.success,
  validator: 'zod-strict',
  artifactSha256: createHash('sha256').update(source).digest('hex'),
  issues: result.success ? [] : result.error.issues,
  validatedAt: new Date().toISOString()
};
writeFileSync(join(root, 'builder-input.validation.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
if (!result.success) process.exit(1);

