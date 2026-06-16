/**
 * Core domain types for speclock.
 *
 * This module — and everything else under `src/core` — is pure: no filesystem,
 * no child processes, no `process`, no `console`. Everything is a plain data
 * transform so the heart of speclock is 100% unit-testable. All I/O lives in
 * `src/cli` (files, exit codes) and `src/adapters` (running test runners).
 */

/** Normalized status of a single test case, runner-agnostic. */
export type TestStatus = 'passed' | 'failed' | 'skipped';

/** One test case, as reported by a test-runner adapter. */
export interface TestCaseResult {
  /** Full human-readable name (describe chain + title), used for tag matching. */
  name: string;
  status: TestStatus;
  /** File the test lives in, if the runner reports it. */
  file?: string;
  /** Duration in milliseconds, if known. */
  duration?: number;
}

/** The structured result of running a test suite via an adapter. */
export interface TestRunResult {
  /** True iff the runner completed and every non-skipped test passed. */
  ok: boolean;
  tests: TestCaseResult[];
  /** Optional human-readable note (e.g. a runner error summary). */
  note?: string;
}

/** A single acceptance criterion parsed from SPEC.md. */
export interface Criterion {
  id: string;
  description: string;
  /** Free-form detail captured from the lines under the criterion heading. */
  detail?: string;
}

/** Outcome of parsing a SPEC.md document. */
export interface SpecParseResult {
  criteria: Criterion[];
  warnings: string[];
}

/** The lock file model (serialized to specs/*.yaml by `plan`). */
export interface Lock {
  version: number;
  /** Relative path of the SPEC.md this lock was generated from. */
  spec: string;
  criteria: LockCriterion[];
}

/** A criterion as recorded in the lock. */
export interface LockCriterion {
  id: string;
  description: string;
  /**
   * Explicit test-name substrings mapped to this criterion. Optional: a test
   * whose name contains the tag `[<id>]` is matched automatically regardless
   * of this list. The resolver unions both mechanisms.
   */
  tests: string[];
}

/** Coverage state of a single criterion after resolving against test results. */
export type CriterionState = 'tested' | 'failing' | 'untested';

/** A criterion plus the tests that map to it and their collective state. */
export interface CriterionCoverage {
  id: string;
  description: string;
  state: CriterionState;
  matchedTests: TestCaseResult[];
}

/** Aggregate coverage of all criteria against a test run. */
export interface CoverageReport {
  criteria: CriterionCoverage[];
  summary: {
    total: number;
    tested: number;
    failing: number;
    untested: number;
  };
}

/** Result of gating a coverage report (the `check` decision). */
export interface CheckResult {
  /** True iff every criterion is `tested` and the underlying suite ran ok. */
  ok: boolean;
  report: CoverageReport;
  /** True iff the test suite itself ran and passed, independent of mapping. */
  suiteOk: boolean;
  /** Human-readable reasons the check failed (empty when ok). */
  problems: string[];
}
