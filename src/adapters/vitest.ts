/**
 * Vitest adapter. Runs `vitest run` with the JSON reporter and normalizes the
 * (Jest-compatible) report into a `TestRunResult`.
 *
 * The parsing logic is shared with the Jest adapter (`parseJestStyleReport`) and
 * re-exported here as `parseVitestReport`; it is pure and unit-tested without
 * spawning a process. Spawning and report I/O live in the shared helpers.
 */

import type { TestRunResult } from '../core/types.js';
import type { AdapterRunOptions, TestRunnerAdapter } from './types.js';
import { AdapterError } from './types.js';
import { resolveLocalBin } from './spawn.js';
import { runJsonReporter } from './run-json.js';
import { parseJestStyleReport } from './jest-report.js';

const DEFAULT_TIMEOUT_MS = 120_000;

/** Normalize a Vitest JSON report into a TestRunResult. Pure. */
export const parseVitestReport = parseJestStyleReport;

export const vitestAdapter: TestRunnerAdapter = {
  name: 'vitest',
  run(options: AdapterRunOptions): Promise<TestRunResult> {
    const { cwd } = options;
    const bin = resolveLocalBin(cwd, 'vitest');
    if (!bin) {
      throw new AdapterError(
        `Could not find a vitest binary in node_modules (searched from ${cwd} upward). Install vitest in your project, or run speclock from the project root.`,
      );
    }
    return runJsonReporter({
      bin,
      cwd,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      label: 'vitest',
      buildArgs: (outFile) => {
        const args = ['run', '--reporter=json', `--outputFile=${outFile}`, '--passWithNoTests'];
        if (options.configPath) args.push(`--config=${options.configPath}`);
        if (options.extraArgs) args.push(...options.extraArgs);
        return args;
      },
      parse: parseJestStyleReport,
    });
  },
};
