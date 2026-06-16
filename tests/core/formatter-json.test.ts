import { describe, it, expect } from 'vitest';
import {
  formatCheckJson,
  formatStatusJson,
  formatJsonError,
  JSON_SCHEMA_VERSION,
} from '../../src/core/formatter.js';
import { resolveCoverage } from '../../src/core/resolver.js';
import { check } from '../../src/core/checker.js';
import type { LockCriterion, TestCaseResult, TestRunResult, TestStatus } from '../../src/core/types.js';

const crit = (id: string): LockCriterion => ({ id, description: id, tests: [] });
const t = (name: string, status: TestStatus): TestCaseResult => ({ name, status });
const run = (tests: TestCaseResult[], ok: boolean): TestRunResult => ({ ok, tests });

describe('formatCheckJson', () => {
  it('[SL-12] is parseable JSON with the gate verdict, summary, suite, and criteria', () => {
    const tests = [t('[AC-1] a', 'passed'), t('[AC-2] b', 'failed')];
    const r = run(tests, false);
    const report = resolveCoverage([crit('AC-1'), crit('AC-2')], r);
    const json = JSON.parse(formatCheckJson(check(report, r), r, { runner: 'vitest' }));

    expect(json.schemaVersion).toBe(JSON_SCHEMA_VERSION);
    expect(json.tool).toBe('speclock');
    expect(json.command).toBe('check');
    expect(json.runner).toBe('vitest');
    expect(json.ok).toBe(false);
    expect(json.summary).toEqual({ total: 2, tested: 1, failing: 1, untested: 0 });
    expect(json.suite).toEqual({ ok: false, tests: 2, note: null });
    expect(json.criteria[0]).toMatchObject({ id: 'AC-1', state: 'tested' });
    expect(json.criteria[0].tests[0]).toEqual({ name: '[AC-1] a', status: 'passed' });
    expect(json.criteria[1].state).toBe('failing');
    expect(Array.isArray(json.problems)).toBe(true);
    expect(json.problems.length).toBeGreaterThan(0);
  });

  it('[SL-12] reports ok:true with empty problems when every criterion passes', () => {
    const r = run([t('[AC-1] a', 'passed')], true);
    const report = resolveCoverage([crit('AC-1')], r);
    const json = JSON.parse(formatCheckJson(check(report, r), r, { runner: 'jest' }));
    expect(json.ok).toBe(true);
    expect(json.problems).toEqual([]);
  });

  it('[SL-12] includes optional test file/duration only when present', () => {
    const tests: TestCaseResult[] = [{ name: '[AC-1] a', status: 'passed', file: 'a.test.ts', duration: 5 }];
    const r = run(tests, true);
    const json = JSON.parse(formatCheckJson(check(resolveCoverage([crit('AC-1')], r), r), r, { runner: 'vitest' }));
    expect(json.criteria[0].tests[0]).toEqual({
      name: '[AC-1] a',
      status: 'passed',
      file: 'a.test.ts',
      duration: 5,
    });
  });
});

describe('formatStatusJson', () => {
  it('[SL-13] is parseable coverage JSON with no gate verdict (no problems field)', () => {
    const r = run([t('[AC-1] a', 'passed')], true);
    const report = resolveCoverage([crit('AC-1'), crit('AC-2')], r);
    const json = JSON.parse(formatStatusJson(report, r, { runner: 'pytest' }));

    expect(json.command).toBe('status');
    expect(json.runner).toBe('pytest');
    expect('problems' in json).toBe(false);
    // ok reflects coverage: AC-2 is untested here.
    expect(json.ok).toBe(false);
    expect(json.summary).toEqual({ total: 2, tested: 1, failing: 0, untested: 1 });
  });
});

describe('formatJsonError', () => {
  it('[SL-12] emits a parseable error object preserving the command', () => {
    const json = JSON.parse(formatJsonError('check', 'No lock files found in specs/.'));
    expect(json).toEqual({
      schemaVersion: JSON_SCHEMA_VERSION,
      tool: 'speclock',
      command: 'check',
      ok: false,
      error: 'No lock files found in specs/.',
    });
  });
});
