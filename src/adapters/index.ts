import type { TestRunnerAdapter } from './types.js';
import { vitestAdapter } from './vitest.js';
import { jestAdapter } from './jest.js';
import { pytestAdapter } from './pytest.js';

const REGISTRY: Record<string, TestRunnerAdapter> = {
  vitest: vitestAdapter,
  jest: jestAdapter,
  pytest: pytestAdapter,
};

export function getAdapter(name: string): TestRunnerAdapter | undefined {
  return REGISTRY[name];
}

export function adapterNames(): string[] {
  return Object.keys(REGISTRY);
}

export { vitestAdapter, jestAdapter, pytestAdapter };
export type { TestRunnerAdapter, AdapterRunOptions } from './types.js';
export { AdapterError } from './types.js';
