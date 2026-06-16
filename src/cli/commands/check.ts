import { check as decide } from '../../core/checker.js';
import { formatCheckResult } from '../../core/formatter.js';
import { computeCoverage } from '../coverage.js';
import { out, err, palette as c } from '../ui.js';

export interface CheckOptions {
  dir: string;
  runner: string;
}

/**
 * Run the suite and gate on the spec. Exit codes:
 *   0 — every criterion implemented and tested
 *   1 — one or more criteria untested/failing, or the suite is red
 *   2 — usage/config error (no specs, bad lock, runner missing)
 */
export async function runCheckCommand(opts: CheckOptions): Promise<number> {
  const cov = await computeCoverage({
    dir: opts.dir,
    runner: opts.runner,
    cwd: process.cwd(),
  });
  if (!cov.ok) {
    err(c.red(cov.message));
    return cov.code;
  }

  err(
    c.dim(
      `Ran ${cov.runnerName}: ${cov.run.tests.length} test(s), ${cov.criteriaCount} criteria in ${cov.fileCount} spec file(s).`,
    ),
  );

  const result = decide(cov.report, cov.run);
  out(formatCheckResult(result, c));
  return result.ok ? 0 : 1;
}
