import { describe, it, expect } from 'vitest';
import { check } from '../../src/core/checker.js';
import { resolveCoverage } from '../../src/core/resolver.js';
import type { LockCriterion, TestCaseResult, TestRunResult, TestStatus } from '../../src/core/types.js';

const crit = (id: string): LockCriterion => ({ id, description: id, tests: [] });
const t = (name: string, status: TestStatus): TestCaseResult => ({ name, status });
const run = (tests: TestCaseResult[], ok: boolean): TestRunResult => ({ ok, tests });

describe('check', () => {
  it('[SL-5] passes when every criterion is tested and the suite is green', () => {
    const tests = [t('[AC-1] a', 'passed')];
    const res = check(resolveCoverage([crit('AC-1')], run(tests, true)), run(tests, true));
    expect(res.ok).toBe(true);
    expect(res.problems).toEqual([]);
  });

  it('[SL-5] fails and explains an untested criterion', () => {
    const res = check(resolveCoverage([crit('AC-1')], run([], true)), run([], true));
    expect(res.ok).toBe(false);
    expect(res.problems[0]).toContain('AC-1: no test');
  });

  it('[SL-5] fails on a criterion whose mapped test is not passing', () => {
    const tests = [t('[AC-1] a', 'failed')];
    const res = check(resolveCoverage([crit('AC-1')], run(tests, false)), run(tests, false));
    expect(res.ok).toBe(false);
    expect(res.problems.some((p) => p.includes('not passing'))).toBe(true);
  });

  it('[SL-5] fails when an unmapped test is red even though all criteria pass', () => {
    const tests = [t('[AC-1] a', 'passed'), t('rogue suite test', 'failed')];
    const res = check(resolveCoverage([crit('AC-1')], run(tests, false)), run(tests, false));
    expect(res.ok).toBe(false);
    expect(res.problems.some((p) => p.includes('not mapped to any criterion'))).toBe(true);
  });

  it('[SL-5] reports suiteOk from run.ok', () => {
    expect(check(resolveCoverage([], run([], true)), run([], true)).suiteOk).toBe(true);
    expect(check(resolveCoverage([], run([], false)), run([], false)).suiteOk).toBe(false);
  });
});
