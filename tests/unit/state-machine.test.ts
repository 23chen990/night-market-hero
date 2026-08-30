import { describe, expect, it } from 'vitest';
import { canTransition, MAX_FIX_ATTEMPTS } from '../../src/core/state-machine.js';

describe('state machine', () => {
  it('allows the deterministic happy path and rejects skips', () => {
    expect(canTransition('ART_DIRECTIONS', 'WAITING_FOR_ART_APPROVAL')).toBe(true);
    expect(canTransition('BLUEPRINT', 'BUILD')).toBe(false);
  });

  it('limits automatic repairs to two attempts', () => {
    expect(MAX_FIX_ATTEMPTS).toBe(2);
    expect(canTransition('QA', 'FIX', { fixAttempts: 2 })).toBe(false);
  });
});
