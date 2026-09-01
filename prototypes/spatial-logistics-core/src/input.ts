import type { MoveInput, Position } from './simulation.js';

export type KeyboardState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
};

function normalize(vector: MoveInput): MoveInput {
  const magnitude = Math.hypot(vector.x, vector.y);
  if (magnitude === 0) return { x: 0, y: 0 };
  return { x: vector.x / magnitude, y: vector.y / magnitude };
}

export function keyboardMove(state: KeyboardState): MoveInput {
  return normalize({
    x: Number(state.right) - Number(state.left),
    y: Number(state.down) - Number(state.up),
  });
}

export function joystickMove(origin: Position, pointer: Position, deadzone: number, radius: number): MoveInput {
  const offset = { x: pointer.x - origin.x, y: pointer.y - origin.y };
  const magnitude = Math.hypot(offset.x, offset.y);
  if (magnitude <= deadzone || radius <= deadzone) return { x: 0, y: 0 };
  const direction = normalize(offset);
  const strength = Math.min(1, (magnitude - deadzone) / (radius - deadzone));
  return { x: direction.x * strength, y: direction.y * strength };
}

export function mergeMoveActions(primary: MoveInput, secondary: MoveInput): MoveInput {
  return normalize({ x: primary.x + secondary.x, y: primary.y + secondary.y });
}
