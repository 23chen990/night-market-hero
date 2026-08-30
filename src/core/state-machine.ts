import type { StageName } from '../schemas/index.js';

export const MAX_FIX_ATTEMPTS = 2;
const transitions: Partial<Record<StageName, StageName[]>> = {
  CREATED: ['BLUEPRINT'], BLUEPRINT: ['ART_DIRECTIONS'], ART_DIRECTIONS: ['WAITING_FOR_ART_APPROVAL'],
  WAITING_FOR_ART_APPROVAL: ['STYLE_LOCK'], STYLE_LOCK: ['ASSETS'], ASSETS: ['BUILD'], BUILD: ['QA'],
  QA: ['FIX', 'RELEASE'], FIX: ['QA'], RELEASE: ['COMPLETED'],
};

export function canTransition(from: StageName, to: StageName, context: { fixAttempts?: number } = {}): boolean {
  if (to === 'FAILED') return from !== 'COMPLETED';
  if (from === 'QA' && to === 'FIX' && (context.fixAttempts ?? 0) >= MAX_FIX_ATTEMPTS) return false;
  return transitions[from]?.includes(to) ?? false;
}
