#!/usr/bin/env node
import path from 'node:path';
import { createFactory } from '../factory.js';
import { StageNameSchema } from '../schemas/index.js';

const [command, ...args] = process.argv.slice(2); const repositoryRoot = process.cwd(); const factory = createFactory({ repositoryRoot, root: process.env.FACTORY_ROOT ? path.resolve(process.env.FACTORY_ROOT) : repositoryRoot });
function requireArg(value: string | undefined, name: string): string { if (!value) throw new Error(`Missing ${name}`); return value; }
async function main() {
  switch (command) {
    case 'validate': { const seed = await factory.validate(path.resolve(requireArg(args[0], 'seed-file'))); console.log(JSON.stringify({ valid: true, seed }, null, 2)); break; }
    case 'new': { const runId = await factory.newRun(path.resolve(requireArg(args[0], 'seed-file'))); console.log(runId); break; }
    case 'run': console.log(JSON.stringify(await factory.run(requireArg(args[0], 'run-id')), null, 2)); break;
    case 'status': console.log(JSON.stringify(await factory.status(requireArg(args[0], 'run-id')), null, 2)); break;
    case 'resume': console.log(JSON.stringify(await factory.resume(requireArg(args[0], 'run-id')), null, 2)); break;
    case 'retry': console.log(JSON.stringify(await factory.retry(requireArg(args[0], 'run-id'), StageNameSchema.parse(requireArg(args[1], 'stage').toUpperCase())), null, 2)); break;
    case 'inspect': console.log(JSON.stringify(await factory.inspect(requireArg(args[0], 'run-id')), null, 2)); break;
    case 'demo': { const runId = await factory.demo(args[0] ? path.resolve(args[0]) : undefined); console.log(JSON.stringify({ runId, state: await factory.status(runId) }, null, 2)); break; }
    default: throw new Error('Usage: factory <validate|new|run|status|resume|retry|inspect|demo> [...args]');
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
