/**
 * Shared pipeline for `check` and `status`: load locks → run the suite via an
 * adapter → resolve coverage. Returns a tagged outcome instead of throwing so
 * commands can map failures to exit codes.
 */

import { resolve } from 'node:path';
import { resolveCoverage } from '../core/resolver.js';
import type { CoverageReport, TestRunResult } from '../core/types.js';
import { getAdapter, adapterNames } from '../adapters/index.js';
import { AdapterError } from '../adapters/types.js';
import type { TestRunnerAdapter } from '../adapters/types.js';
import { loadLocks, SpecLoadError } from './specs.js';

export interface CoverageOptions {
  dir: string;
  runner: string;
  cwd: string;
  /** Inject a runner (tests) instead of resolving `runner` from the registry. */
  adapter?: TestRunnerAdapter;
}

export type CoverageOutcome =
  | {
      ok: true;
      report: CoverageReport;
      run: TestRunResult;
      fileCount: number;
      criteriaCount: number;
      runnerName: string;
    }
  | { ok: false; code: number; message: string };

export async function computeCoverage(
  opts: CoverageOptions,
): Promise<CoverageOutcome> {
  // Resolve the lock dir against the (possibly injected) cwd so it tracks the
  // same root the adapter runs in; messages still show the user's `dir`.
  const lockDir = resolve(opts.cwd, opts.dir);
  let loaded;
  try {
    loaded = loadLocks(lockDir);
  } catch (e) {
    return {
      ok: false,
      code: 2,
      message: e instanceof SpecLoadError ? e.message : String(e),
    };
  }
  if (loaded.files.length === 0) {
    return {
      ok: false,
      code: 2,
      message: `No lock files found in ${opts.dir}/. Run \`speclock plan\` first.`,
    };
  }
  if (loaded.criteria.length === 0) {
    return {
      ok: false,
      code: 2,
      message: `No criteria found in ${opts.dir}/. Add criteria to your spec and re-run \`speclock plan\`.`,
    };
  }

  const adapter = opts.adapter ?? getAdapter(opts.runner);
  if (!adapter) {
    return {
      ok: false,
      code: 2,
      message: `Unknown runner "${opts.runner}". Available: ${adapterNames().join(', ')}.`,
    };
  }

  let run: TestRunResult;
  try {
    run = await adapter.run({ cwd: opts.cwd });
  } catch (e) {
    return {
      ok: false,
      code: 2,
      message: e instanceof AdapterError || e instanceof Error ? e.message : String(e),
    };
  }

  return {
    ok: true,
    report: resolveCoverage(loaded.criteria, run),
    run,
    fileCount: loaded.files.length,
    criteriaCount: loaded.criteria.length,
    runnerName: adapter.name,
  };
}
