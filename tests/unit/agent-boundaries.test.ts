import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, it } from 'vitest';

it('keeps generated game workspace mutations inside BuilderAgent and FixerAgent', async () => {
  const orchestrator = await readFile(path.join(process.cwd(), 'src/factory.ts'), 'utf8');
  expect(orchestrator).not.toMatch(/runtime\.(createProject|applyBlueprint|importAssets|buildWeb|buildTarget)\(/);

  const roles = await readFile(path.join(process.cwd(), 'src/agents/index.ts'), 'utf8');
  expect(roles).toMatch(/class BuilderAgent[\s\S]*createProject[\s\S]*buildWeb/);
  expect(roles).toMatch(/class FixerAgent[\s\S]*buildWeb/);
});
