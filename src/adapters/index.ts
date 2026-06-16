import type { TestRunnerAdapter } from './types.js';
import { vitestAdapter } from './vitest.js';

const REGISTRY: Record<string, TestRunnerAdapter> = {
  vitest: vitestAdapter,
};

export function getAdapter(name: string): TestRunnerAdapter | undefined {
  return REGISTRY[name];
}

export function adapterNames(): string[] {
  return Object.keys(REGISTRY);
}

export { vitestAdapter };
export type { TestRunnerAdapter, AdapterRunOptions } from './types.js';
export { AdapterError } from './types.js';
