/**
 * Jest adapter. Runs `jest --json` writing to a temp file and normalizes the
 * report into a `TestRunResult`.
 *
 * Jest's `--json` report is the same shape Vitest's JSON reporter emits, so the
 * pure parser (`parseJestStyleReport`, re-exported here as `parseJestReport`) is
 * shared between the two adapters.
 */

import type { AdapterRunOptions, TestRunnerAdapter } from './types.js';
import { AdapterError } from './types.js';
import { resolveLocalBin } from './spawn.js';
import { runJsonReporter } from './run-json.js';
import { parseJestStyleReport } from './jest-report.js';
import type { TestRunResult } from '../core/types.js';

const DEFAULT_TIMEOUT_MS = 120_000;

/** Normalize a Jest JSON report into a TestRunResult. Pure. */
export const parseJestReport = parseJestStyleReport;

export const jestAdapter: TestRunnerAdapter = {
  name: 'jest',
  run(options: AdapterRunOptions): Promise<TestRunResult> {
    const { cwd } = options;
    const bin = resolveLocalBin(cwd, 'jest');
    if (!bin) {
      throw new AdapterError(
        `Could not find a jest binary in node_modules (searched from ${cwd} upward). Install jest in your project, or run speclock from the project root.`,
      );
    }
    return runJsonReporter({
      bin,
      cwd,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      label: 'jest',
      buildArgs: (outFile) => {
        const args = ['--json', `--outputFile=${outFile}`, '--passWithNoTests'];
        if (options.configPath) args.push(`--config=${options.configPath}`);
        if (options.extraArgs) args.push(...options.extraArgs);
        return args;
      },
      parse: parseJestStyleReport,
    });
  },
};
