import { describe, it, expect } from 'vitest';
import {
  formatCheckResult,
  formatCoverageLines,
  formatStatus,
  formatSummaryLine,
  plainPalette as p,
} from '../../src/core/formatter.js';
import { resolveCoverage } from '../../src/core/resolver.js';
import { check } from '../../src/core/checker.js';
import type { TestCaseResult, TestRunResult, TestStatus, LockCriterion } from '../../src/core/types.js';

const crit = (id: string): LockCriterion => ({ id, description: `desc ${id}`, tests: [] });
const t = (name: string, status: TestStatus): TestCaseResult => ({ name, status });
const run = (tests: TestCaseResult[], ok: boolean): TestRunResult => ({ ok, tests });

// A: tested, B: failing, C: untested
const tests = [t('[A] x', 'passed'), t('[B] y', 'failed')];
const report = resolveCoverage([crit('A'), crit('B'), crit('C')], run(tests, false));

describe('coverage formatting', () => {
  it('[SL-7] renders a symbol per criterion state', () => {
    const lines = formatCoverageLines(report, p);
    expect(lines).toContain('✅ A');
    expect(lines).toContain('🚧 B');
    expect(lines).toContain('❌ C');
    expect(lines).toContain('desc A');
  });

  it('[SL-7] renders a summary tally', () => {
    const s = formatSummaryLine(report, p);
    expect(s).toContain('3 criteria');
    expect(s).toContain('1 ✅ tested');
    expect(s).toContain('1 🚧 failing');
    expect(s).toContain('1 ❌ untested');
  });

  it('[SL-7] status output combines the map and the summary', () => {
    const s = formatStatus(report, p);
    expect(s).toContain('✅ A');
    expect(s).toContain('3 criteria');
  });

  it('[SL-7] handles an empty report gracefully', () => {
    const empty = resolveCoverage([], run([], true));
    expect(formatCoverageLines(empty, p)).toContain('Run `speclock plan`');
  });
});

describe('check verdict formatting', () => {
  it('[SL-5] shows a failure verdict with problems', () => {
    const out = formatCheckResult(check(report, run(tests, false)), p);
    expect(out).toContain('✗ speclock check failed');
    expect(out).toContain('C: no test');
  });

  it('[SL-5] shows a success verdict when all criteria pass', () => {
    const okTests = [t('[A] x', 'passed')];
    const okReport = resolveCoverage([crit('A')], run(okTests, true));
    const out = formatCheckResult(check(okReport, run(okTests, true)), p);
    expect(out).toContain('✓ All 1 criteria are implemented and tested.');
  });
});
