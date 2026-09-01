import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { Hybrid3dAssetResearchArtifactSchema } from '../../src/schemas/hybrid-3d-assets.js';
import { GeneratedAlphaValidationArtifactSchema } from '../../src/schemas/generated-alpha-validation.js';
import { OpenSourceResearchArtifactSchema } from '../../src/schemas/open-source-research.js';
import { AssetManifestSchema, GameBlueprintSchema, StyleLockSchema } from '../../src/schemas/index.js';

const runArtifacts = 'runs/20260830165832-6d29b0ff/artifacts';

describe('toy factory 3D research artifacts', () => {
  it('locks infrastructure reuse before technical design', async () => {
    const value = JSON.parse(await readFile(`${runArtifacts}/open-source-research.json`, 'utf8'));
    const artifact = OpenSourceResearchArtifactSchema.parse(value);

    expect(artifact.conclusion.approvedCandidateNames).toEqual(['Cocos Engine']);
    expect(artifact.targetWorkspace).toBe('runs/20260830165832-6d29b0ff/workspace/game');
  });

  it('locks only the minimal 3D packs and the generated cutout boundary', async () => {
    const value = JSON.parse(await readFile(`${runArtifacts}/hybrid-3d-asset-research.json`, 'utf8'));
    const artifact = Hybrid3dAssetResearchArtifactSchema.parse(value);

    expect(artifact.selectedSourceIds).toEqual(['kenney-factory-kit-3.0', 'kenney-mini-characters-1.0']);
    expect(artifact.visualStrategy.forbiddenGeneratedImageUsage).toContain('collision-shape');
  });

  it('admits only generated cutouts that passed alpha validation', async () => {
    const validation = GeneratedAlphaValidationArtifactSchema.parse(JSON.parse(await readFile(`${runArtifacts}/generated-alpha-validation.json`, 'utf8')));
    const manifest = AssetManifestSchema.parse(JSON.parse(await readFile(`${runArtifacts}/asset-manifest.json`, 'utf8')));

    expect(validation.assets).toHaveLength(4);
    expect(manifest.assets.map(({ id }) => id).sort()).toEqual(validation.assets.map(({ id }) => id).sort());
  });

  it('locks the hybrid visual design and acceleration-driven carry-stack sway before build', async () => {
    const blueprint = GameBlueprintSchema.parse(JSON.parse(await readFile(`${runArtifacts}/game-blueprint.json`, 'utf8')));
    const styleLock = StyleLockSchema.parse(JSON.parse(await readFile(`${runArtifacts}/style-lock.json`, 'utf8')));
    const carryMotion = blueprint.preferences.carryStackMotion as Record<string, unknown>;

    expect(blueprint.runtime).toBe('cocos-3d');
    expect(carryMotion).toMatchObject({
      model: 'damped-spring',
      drivenBy: ['acceleration', 'turning', 'stopping'],
      maximumAngleDegrees: 8,
      collisionRole: 'true-3d-only',
    });
    expect(Number(carryMotion.upperLayerGain)).toBeGreaterThan(Number(carryMotion.lowerLayerGain));
    expect(styleLock.notes).toContain('Generated product images sway only as visual layers; true-3D carry nodes own interaction and collision.');
  });
});
