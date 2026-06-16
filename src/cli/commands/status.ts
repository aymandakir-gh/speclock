import { formatStatus } from '../../core/formatter.js';
import { computeCoverage } from '../coverage.js';
import { out, err, palette as c } from '../ui.js';

export interface StatusOptions {
  dir: string;
  runner: string;
}

/**
 * Print a coverage map of all criteria. Informational: it never fails the build
 * (always returns 0 on success), so it's safe to run anywhere. Exit code 2 is
 * reserved for usage/config errors (no specs, runner missing).
 */
export async function runStatusCommand(opts: StatusOptions): Promise<number> {
  const cov = await computeCoverage({
    dir: opts.dir,
    runner: opts.runner,
    cwd: process.cwd(),
  });
  if (!cov.ok) {
    err(c.red(cov.message));
    return cov.code;
  }
  out(formatStatus(cov.report, c));
  return 0;
}
