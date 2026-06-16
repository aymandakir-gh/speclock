import { describe, it, expect } from 'vitest';
import {
  formatCheckResult,
  formatStatus,
  formatSummaryLine,
  plainPalette,
  type Palette,
} from '../../src/core/formatter.js';
import { resolveCoverage } from '../../src/core/resolver.js';
import { check } from '../../src/core/checker.js';
import type { LockCriterion, TestCaseResult, TestRunResult, TestStatus } from '../../src/core/types.js';

const crit = (id: string): LockCriterion => ({ id, description: `desc ${id}`, tests: [] });
const t = (name: string, status: TestStatus): TestCaseResult => ({ name, status });
const run = (tests: TestCaseResult[], ok: boolean): TestRunResult => ({ ok, tests });

// A visible "loud" palette: every color wraps its text with markers we can find.
const loud: Palette = {
  green: (s) => `<g>${s}</g>`,
  red: (s) => `<r>${s}</r>`,
  yellow: (s) => `<y>${s}</y>`,
  cyan: (s) => `<c>${s}</c>`,
  dim: (s) => `<d>${s}</d>`,
  bold: (s) => `<b>${s}</b>`,
};

const tests = [t('[A] x', 'passed'), t('[B] y', 'failed')];
const report = resolveCoverage([crit('A'), crit('B'), crit('C')], run(tests, false));

describe('color is injected via the palette', () => {
  it('[SL-19] applies the palette wrappers when color is on', () => {
    const summary = formatSummaryLine(report, loud);
    expect(summary).toContain('<g>'); // tested count painted green
    expect(summary).toContain('<r>'); // untested count painted red
    const verdict = formatCheckResult(check(report, run(tests, false)), loud);
    expect(verdict).toContain('<r>'); // failure verdict painted red
  });

  it('[SL-19] the same renderer emits plain text under the plain palette', () => {
    const plain = formatSummaryLine(report, plainPalette);
    // The plain palette is the identity function: none of the loud markers leak.
    for (const marker of ['<g>', '<r>', '<y>', '<c>', '<d>', '<b>']) {
      expect(plain).not.toContain(marker);
    }
    expect(plain).toContain('3 criteria');
  });

  it('[SL-19] palette choice changes the output (proving injection, not hard-coding)', () => {
    const loudOut = formatStatus(report, loud);
    const plainOut = formatStatus(report, plainPalette);
    expect(loudOut).not.toBe(plainOut);
    // …but the uncolored content (criterion ids) is present in both.
    expect(loudOut).toContain('A');
    expect(plainOut).toContain('A');
  });
});
