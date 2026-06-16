/**
 * The check decision — pure.
 *
 * `check` passes iff every criterion is tested (≥1 mapped test, all passing)
 * AND the underlying suite ran green. A red suite fails the gate even if its
 * failing tests aren't mapped to any criterion — a broken suite is never a pass.
 */

import type { CheckResult, CoverageReport, TestRunResult } from './types.js';

export function check(report: CoverageReport, run: TestRunResult): CheckResult {
  const problems: string[] = [];

  for (const c of report.criteria) {
    if (c.state === 'untested') {
      problems.push(`${c.id}: no test maps to this criterion.`);
    } else if (c.state === 'failing') {
      const bad = c.matchedTests
        .filter((t) => t.status !== 'passed')
        .map((t) => `${t.name} (${t.status})`);
      problems.push(`${c.id}: mapped test(s) not passing — ${bad.join('; ')}`);
    }
  }

  // Surface suite failures that aren't already attributed to a criterion.
  const mappedNames = new Set(
    report.criteria.flatMap((c) => c.matchedTests.map((t) => t.name)),
  );
  const unmappedFailures = run.tests.filter(
    (t) => t.status === 'failed' && !mappedNames.has(t.name),
  );
  if (unmappedFailures.length > 0) {
    const shown = unmappedFailures.slice(0, 3).map((t) => t.name);
    const more = unmappedFailures.length > 3 ? '; …' : '';
    problems.push(
      `${unmappedFailures.length} failing test(s) not mapped to any criterion (suite is red): ${shown.join('; ')}${more}`,
    );
  } else if (!run.ok && run.note) {
    problems.push(`Test suite did not pass: ${run.note}`);
  }

  const ok =
    report.summary.untested === 0 && report.summary.failing === 0 && run.ok;

  return { ok, report, suiteOk: run.ok, problems };
}
