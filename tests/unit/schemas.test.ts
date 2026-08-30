import { describe, expect, it } from 'vitest';
import { ArtDirectionsSchema, SeedSchema, StageRecordSchema } from '../../src/schemas/index.js';

describe('artifact schemas', () => {
  it('rejects a seed without a supported template', () => {
    expect(() => SeedSchema.parse({ title: 'x', theme: 'ghosts', template: 'unknown' })).toThrow();
  });

  it('requires exactly four uniquely identified art directions', () => {
    const direction = { id: 'direction_a', name: 'A', keywords: ['ink'], palette: ['#112233'], characterProportion: '1:2', uiStyle: 'round', sceneStyle: 'night', forbidden: ['copied IP'], productionComplexity: 'low', imagePrompt: 'original ink market' };
    expect(() => ArtDirectionsSchema.parse({ directions: [direction] })).toThrow();
  });

  it('requires stage execution evidence fields', () => {
    expect(() => StageRecordSchema.parse({ status: 'completed' })).toThrow();
  });
});
