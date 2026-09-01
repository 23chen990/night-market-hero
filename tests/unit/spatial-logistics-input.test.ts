import { describe, expect, it } from 'vitest';

type InputModule = typeof import('../../prototypes/spatial-logistics-core/src/input.js');

async function loadInput(): Promise<InputModule | null> {
  return import('../../prototypes/spatial-logistics-core/src/input.js').catch(() => null);
}

describe('spatial logistics input action', () => {
  it('maps keyboard bindings into one normalized move action', async () => {
    const input = await loadInput();
    expect(input, 'the shared move-action adapter should exist').not.toBeNull();
    if (!input) return;

    expect(input.keyboardMove({ left: true, right: false, up: false, down: false })).toEqual({ x: -1, y: 0 });
    const diagonal = input.keyboardMove({ left: false, right: true, up: true, down: false });
    expect(Math.hypot(diagonal.x, diagonal.y)).toBeCloseTo(1, 5);
  });

  it('applies a radial deadzone and clamps the touch joystick', async () => {
    const input = await loadInput();
    expect(input, 'the shared move-action adapter should exist').not.toBeNull();
    if (!input) return;

    expect(input.joystickMove({ x: 100, y: 100 }, { x: 105, y: 100 }, 12, 60)).toEqual({ x: 0, y: 0 });
    const fullRight = input.joystickMove({ x: 100, y: 100 }, { x: 200, y: 100 }, 12, 60);
    expect(fullRight).toEqual({ x: 1, y: 0 });
  });
});
