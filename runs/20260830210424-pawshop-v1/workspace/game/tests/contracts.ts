import { expect } from 'vitest';

export async function loadContract<T>(loader: () => Promise<T>, name: string): Promise<T> {
  const contract = await loader().catch(() => null);
  expect(contract, `${name} contract should exist before behavior can pass`).not.toBeNull();
  return contract as T;
}
