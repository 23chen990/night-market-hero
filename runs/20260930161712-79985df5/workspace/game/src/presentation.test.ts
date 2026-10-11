import { describe, expect, it } from 'vitest';
import { resetRoundPresentation } from './presentation.js';

describe('round presentation reset', () => {
  it('clears stale action feedback and hides settlement controls on restart', () => {
    const toast = { textContent: '建设完成：潮池已解锁' };
    const settlement = { hidden: false };

    resetRoundPresentation(toast, settlement);

    expect(toast.textContent).toBe('');
    expect(settlement.hidden).toBe(true);
  });
});
