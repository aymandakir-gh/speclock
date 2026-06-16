/**
 * Output formatting — pure. Renders reports to strings. Color is injected via a
 * Palette so the core stays free of TTY/process concerns; the CLI passes a real
 * ANSI palette, tests pass the identity palette.
 */

import type { CheckResult, CoverageReport, CriterionState } from './types.js';

export interface Palette {
  green(s: string): string;
  red(s: string): string;
  yellow(s: string): string;
  cyan(s: string): string;
  dim(s: string): string;
  bold(s: string): string;
}

/** No-op palette: every function returns its input unchanged. */
export const plainPalette: Palette = {
  green: (s) => s,
  red: (s) => s,
  yellow: (s) => s,
  cyan: (s) => s,
  dim: (s) => s,
  bold: (s) => s,
};

const SYMBOL: Record<CriterionState, string> = {
  tested: '✅',
  failing: '🚧',
  untested: '❌',
};

function paintId(id: string, state: CriterionState, p: Palette): string {
  if (state === 'tested') return p.green(id);
  if (state === 'failing') return p.yellow(id);
  return p.red(id);
}

/** One line per criterion: symbol, id, description, and a short note. */
export function formatCoverageLines(report: CoverageReport, p: Palette): string {
  if (report.criteria.length === 0) {
    return p.dim('No criteria found. Run `speclock plan` first.');
  }
  const idWidth = Math.max(...report.criteria.map((c) => c.id.length));
  return report.criteria
    .map((c) => {
      const id = paintId(c.id.padEnd(idWidth), c.state, p);
      let note: string;
      if (c.state === 'untested') note = p.dim('(no test)');
      else if (c.state === 'failing') {
        const bad = c.matchedTests.filter((t) => t.status !== 'passed').length;
        note = p.dim(`(${bad} not passing)`);
      } else {
        const n = c.matchedTests.length;
        note = p.dim(`(${n} test${n === 1 ? '' : 's'})`);
      }
      return `${SYMBOL[c.state]} ${id}  ${c.description} ${note}`;
    })
    .join('\n');
}

/** Single-line tally of criteria states. */
export function formatSummaryLine(report: CoverageReport, p: Palette): string {
  const s = report.summary;
  return [
    `${s.total} criteria`,
    p.green(`${s.tested} ✅ tested`),
    p.yellow(`${s.failing} 🚧 failing`),
    p.red(`${s.untested} ❌ untested`),
  ].join('  ·  ');
}

/** Full `status` output: coverage lines + summary. */
export function formatStatus(report: CoverageReport, p: Palette): string {
  return `${formatCoverageLines(report, p)}\n\n${formatSummaryLine(report, p)}`;
}

/** Full `check` output: coverage + summary + verdict (+ problems on failure). */
export function formatCheckResult(result: CheckResult, p: Palette): string {
  const head = formatStatus(result.report, p);
  if (result.ok) {
    return `${head}\n\n${p.green(`✓ All ${result.report.summary.total} criteria are implemented and tested.`)}`;
  }
  const problems = result.problems.map((x) => p.red(`  • ${x}`)).join('\n');
  return `${head}\n\n${p.red('✗ speclock check failed:')}\n${problems}`;
}
