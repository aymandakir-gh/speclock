import { describe, it, expect } from 'vitest';
import { matchTests, resolveCoverage } from '../../src/core/resolver.js';
import type { LockCriterion, TestCaseResult, TestRunResult, TestStatus } from '../../src/core/types.js';

const crit = (id: string, tests: string[] = []): LockCriterion => ({
  id,
  description: id,
  tests,
});
const t = (name: string, status: TestStatus): TestCaseResult => ({ name, status });
const run = (tests: TestCaseResult[]): TestRunResult => ({
  ok: tests.every((x) => x.status !== 'failed'),
  tests,
});

describe('matchTests', () => {
  it('[SL-4] matches a test by its [id] tag', () => {
    const tests = [t('group > foo [AC-1] bar', 'passed'), t('no tag here', 'passed')];
    expect(matchTests(crit('AC-1'), tests).map((x) => x.name)).toEqual(['group > foo [AC-1] bar']);
  });

  it('[SL-4] does not confuse [AC-1] with [AC-10]', () => {
    const tests = [t('x [AC-10] y', 'passed')];
    expect(matchTests(crit('AC-1'), tests)).toEqual([]);
    expect(matchTests(crit('AC-10'), tests)).toHaveLength(1);
  });

  it('[SL-4] matches by an explicit substring from the lock', () => {
    const tests = [t('login.test.ts > valid creds', 'passed')];
    expect(matchTests(crit('AC-1', ['login.test.ts > valid']), tests)).toHaveLength(1);
  });

  it('[SL-4] ignores empty substrings (would match everything)', () => {
    expect(matchTests(crit('AC-1', ['']), [t('anything', 'passed')])).toEqual([]);
  });
});

describe('resolveCoverage', () => {
  it('[SL-4] is tested when every matched test passes', () => {
    const r = resolveCoverage([crit('AC-1')], run([t('[AC-1] a', 'passed'), t('[AC-1] b', 'passed')]));
    expect(r.criteria[0]!.state).toBe('tested');
  });

  it('[SL-4] is failing when any matched test fails', () => {
    const r = resolveCoverage([crit('AC-1')], run([t('[AC-1] a', 'passed'), t('[AC-1] b', 'failed')]));
    expect(r.criteria[0]!.state).toBe('failing');
  });

  it('[SL-4] is failing when the only matched test is skipped', () => {
    const r = resolveCoverage([crit('AC-1')], run([t('[AC-1] a', 'skipped')]));
    expect(r.criteria[0]!.state).toBe('failing');
  });

  it('[SL-4] is untested when nothing maps to it', () => {
    const r = resolveCoverage([crit('AC-1')], run([t('unrelated', 'passed')]));
    expect(r.criteria[0]!.state).toBe('untested');
  });

  it('[SL-4] computes summary counts', () => {
    const r = resolveCoverage(
      [crit('AC-1'), crit('AC-2'), crit('AC-3')],
      run([t('[AC-1] a', 'passed'), t('[AC-2] b', 'failed')]),
    );
    expect(r.summary).toEqual({ total: 3, tested: 1, failing: 1, untested: 1 });
  });
});
