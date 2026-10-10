import { describe, expect, it } from 'vitest';
import { validateNativeReceipt } from './native-handoff.js';

const request = { requestId: 'request-1', stage: 'BLUEPRINT', model: 'gpt-5.6-luna' };
const receipt = { schemaVersion: 1, requestId: 'request-1', stage: 'BLUEPRINT', model: 'gpt-5.6-luna', agentId: '/root/luna_producer', outputPath: 'artifacts/blueprint.json', sha256: 'a'.repeat(64), completedAt: '2026-09-18T10:00:00.000Z' };

describe('run-local native handoff receipt', () => {
  it('accepts only the requested stage, model and exact output bytes', () => {
    expect(validateNativeReceipt(request, receipt, 'a'.repeat(64)).agentId).toBe('/root/luna_producer');
    expect(() => validateNativeReceipt(request, { ...receipt, stage: 'FULL_BUILD' }, 'a'.repeat(64))).toThrow();
    expect(() => validateNativeReceipt(request, { ...receipt, model: 'gpt-5.6-terra' }, 'a'.repeat(64))).toThrow();
    expect(() => validateNativeReceipt(request, receipt, 'b'.repeat(64))).toThrow();
  });
  it('rejects a stale request and fabricated missing completion identity', () => {
    expect(() => validateNativeReceipt(request, { ...receipt, requestId: 'old-request' }, 'a'.repeat(64))).toThrow();
    expect(() => validateNativeReceipt(request, { ...receipt, agentId: '' }, 'a'.repeat(64))).toThrow();
  });
});
