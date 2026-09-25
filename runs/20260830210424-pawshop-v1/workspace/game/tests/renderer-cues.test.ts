import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('icon-first world renderer contract', () => {
  it('removes persistent station, door, and customer explanatory text', () => {
    const source = read('../src/main.ts');

    expect(source).not.toContain('nearbyStatus');
    expect(source).not.toContain('this.createStationLabels()');
    expect(source).not.toContain('stationLabels');
    expect(source).not.toContain("this.add.text(CUSTOMER_ENTRY.x, CUSTOMER_ENTRY.y + 26, '大门'");
    expect(source).not.toContain('const cue = this.add.text');
    expect(source).not.toContain('cue.setText(customer.state');
  });

  it('bounds station-entry context to a one-second transient cue', () => {
    const source = read('../src/main.ts');
    const css = read('../src/style.css');
    const duration = source.match(/CONTEXTUAL_CUE_DURATION_MS\s*=\s*(\d+)/)?.[1];

    expect(duration).toBeDefined();
    expect(Number(duration)).toBeGreaterThan(0);
    expect(Number(duration)).toBeLessThanOrEqual(1_000);
    expect(source).toContain('objectiveChip.hidden = !contextualCue');
    expect(css).toMatch(/#objective-chip\[hidden\]\s*\{\s*display:\s*none\s*;/);
  });
});
