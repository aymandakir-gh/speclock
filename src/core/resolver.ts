/**
 * Test-mapping resolver — pure.
 *
 * Maps acceptance criteria to the tests that cover them, then derives each
 * criterion's coverage state from the test results.
 *
 * A test covers a criterion when its name either:
 *   - contains the tag `[<id>]` (the zero-config default), or
 *   - contains any of the explicit substrings listed in the criterion's `tests`.
 *
 * The closing bracket in the tag means `[AC-1]` never accidentally matches
 * `[AC-10]`.
 */

import type {
  CoverageReport,
  CriterionCoverage,
  CriterionState,
  LockCriterion,
  TestCaseResult,
  TestRunResult,
} from './types.js';

/** Tests covering a single criterion (by tag or explicit substring). */
export function matchTests(
  criterion: LockCriterion,
  tests: TestCaseResult[],
): TestCaseResult[] {
  const tag = `[${criterion.id}]`;
  const subs = criterion.tests.filter((s) => s.length > 0);
  return tests.filter(
    (t) => t.name.includes(tag) || subs.some((s) => t.name.includes(s)),
  );
}

function stateFor(matched: TestCaseResult[]): CriterionState {
  if (matched.length === 0) return 'untested';
  return matched.every((t) => t.status === 'passed') ? 'tested' : 'failing';
}

/** Resolve all criteria against a test run into a coverage report. */
export function resolveCoverage(
  criteria: LockCriterion[],
  run: TestRunResult,
): CoverageReport {
  const coverage: CriterionCoverage[] = criteria.map((c) => {
    const matchedTests = matchTests(c, run.tests);
    return {
      id: c.id,
      description: c.description,
      state: stateFor(matchedTests),
      matchedTests,
    };
  });

  return {
    criteria: coverage,
    summary: {
      total: coverage.length,
      tested: coverage.filter((c) => c.state === 'tested').length,
      failing: coverage.filter((c) => c.state === 'failing').length,
      untested: coverage.filter((c) => c.state === 'untested').length,
    },
  };
}
