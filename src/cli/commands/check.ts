import { check as decide } from '../../core/checker.js';
import { formatCheckResult, formatCheckJson, formatJsonError } from '../../core/formatter.js';
import type { TestRunnerAdapter } from '../../adapters/types.js';
import { computeCoverage } from '../coverage.js';
import { out, err, palette as c } from '../ui.js';

export interface CheckOptions {
  dir: string;
  runner: string;
  /** Emit a machine-readable JSON object on stdout instead of the TTY view. */
  json?: boolean;
  /** Overrides for testing. */
  cwd?: string;
  adapter?: TestRunnerAdapter;
}

/**
 * Run the suite and gate on the spec. Exit codes:
 *   0 — every criterion implemented and tested
 *   1 — one or more criteria untested/failing, or the suite is red
 *   2 — usage/config error (no specs, bad lock, runner missing)
 *
 * With `--json`, stdout carries one JSON object (diagnostics stay on stderr);
 * the exit code is unchanged.
 */
export async function runCheckCommand(opts: CheckOptions): Promise<number> {
  const cov = await computeCoverage({
    dir: opts.dir,
    runner: opts.runner,
    cwd: opts.cwd ?? process.cwd(),
    adapter: opts.adapter,
  });
  if (!cov.ok) {
    if (opts.json) out(formatJsonError('check', cov.message));
    else err(c.red(cov.message));
    return cov.code;
  }

  const result = decide(cov.report, cov.run);

  if (opts.json) {
    out(formatCheckJson(result, cov.run, { runner: cov.runnerName }));
    return result.ok ? 0 : 1;
  }

  err(
    c.dim(
      `Ran ${cov.runnerName}: ${cov.run.tests.length} test(s), ${cov.criteriaCount} criteria in ${cov.fileCount} spec file(s).`,
    ),
  );
  out(formatCheckResult(result, c));
  return result.ok ? 0 : 1;
}
