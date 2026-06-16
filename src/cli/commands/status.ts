import { formatStatus, formatStatusJson, formatJsonError } from '../../core/formatter.js';
import type { TestRunnerAdapter } from '../../adapters/types.js';
import { computeCoverage } from '../coverage.js';
import { out, err, palette as c } from '../ui.js';

export interface StatusOptions {
  dir: string;
  runner: string;
  /** Emit a machine-readable JSON object on stdout instead of the TTY view. */
  json?: boolean;
  /** Overrides for testing. */
  cwd?: string;
  adapter?: TestRunnerAdapter;
}

/**
 * Print a coverage map of all criteria. Informational: it never fails the build
 * (always returns 0 on success), so it's safe to run anywhere. Exit code 2 is
 * reserved for usage/config errors (no specs, runner missing).
 *
 * With `--json`, stdout carries one JSON object; the exit code is unchanged.
 */
export async function runStatusCommand(opts: StatusOptions): Promise<number> {
  const cov = await computeCoverage({
    dir: opts.dir,
    runner: opts.runner,
    cwd: opts.cwd ?? process.cwd(),
    adapter: opts.adapter,
  });
  if (!cov.ok) {
    if (opts.json) out(formatJsonError('status', cov.message));
    else err(c.red(cov.message));
    return cov.code;
  }
  if (opts.json) {
    out(formatStatusJson(cov.report, cov.run, { runner: cov.runnerName }));
    return 0;
  }
  out(formatStatus(cov.report, c));
  return 0;
}
