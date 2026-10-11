import { describe, expect, it } from 'vitest';
import { keyboardMove, rotateDisplayMoveForWorld } from './input.js';

describe('screen-relative movement input', () => {
  it.each([
    ['up', { left: false, right: false, up: true, down: false }, { x: -1, y: 0 }],
    ['left', { left: true, right: false, up: false, down: false }, { x: 0, y: 1 }],
    ['down', { left: false, right: false, up: false, down: true }, { x: 1, y: 0 }],
    ['right', { left: false, right: true, up: false, down: false }, { x: 0, y: -1 }],
  ])('maps %s keyboard input through the landscape renderer', (_label, keys, expected) => {
    expect(rotateDisplayMoveForWorld(keyboardMove(keys), 'landscape')).toEqual(expected);
  });

  it('uses the same screen mapping for a touch vector and keyboard vector', () => {
    const keyboard = rotateDisplayMoveForWorld(keyboardMove({ left: false, right: false, up: true, down: false }), 'landscape');
    const touch = rotateDisplayMoveForWorld({ x: 0, y: -1 }, 'landscape');
    expect(touch).toEqual(keyboard);
  });
});
