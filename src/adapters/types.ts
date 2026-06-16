/**
 * Test-runner adapter interface.
 *
 * Adapters live outside the pure core because running a test process is I/O.
 * An adapter's only job: run the project's suite and return a normalized
 * `TestRunResult`. The Vitest adapter ships first; Jest/pytest/go can implement
 * the same interface later (see docs/ADAPTERS.md).
 */

import type { TestRunResult } from '../core/types.js';

export interface AdapterRunOptions {
  /** Project root to run the suite in. */
  cwd: string;
  /** Optional explicit config path passed to the runner. */
  configPath?: string;
  /** Extra args forwarded to the runner verbatim. */
  extraArgs?: string[];
  /** Per-run timeout in milliseconds (default 120000). */
  timeoutMs?: number;
}

export interface TestRunnerAdapter {
  readonly name: string;
  run(options: AdapterRunOptions): Promise<TestRunResult>;
}

/** Raised when an adapter cannot run the suite or parse its results. */
export class AdapterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AdapterError';
  }
}
