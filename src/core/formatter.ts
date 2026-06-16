/**
 * Output formatting — pure. Renders reports to strings. Color is injected via a
 * Palette so the core stays free of TTY/process concerns; the CLI passes a real
 * ANSI palette, tests pass the identity palette.
 */

import type { CheckResult, CoverageReport, CriterionState, TestRunResult } from './types.js';

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

// --- Machine-readable JSON output ---------------------------------------------
//
// `check --json` / `status --json` emit one JSON object on stdout for PR bots
// and other tooling. The shape is versioned via `schemaVersion`; new fields may
// be added within a version, but existing fields keep their meaning.

/** Current version of the JSON output schema. */
export const JSON_SCHEMA_VERSION = 1;

export interface JsonMeta {
  /** Name of the adapter/runner that produced the results. */
  runner: string;
}

/** Build the part of the JSON report shared by `check` and `status`. */
function coverageJsonBase(
  command: 'check' | 'status',
  report: CoverageReport,
  run: TestRunResult,
  meta: JsonMeta,
): Record<string, unknown> {
  return {
    schemaVersion: JSON_SCHEMA_VERSION,
    tool: 'speclock',
    command,
    runner: meta.runner,
    ok: report.summary.untested === 0 && report.summary.failing === 0 && run.ok,
    summary: {
      total: report.summary.total,
      tested: report.summary.tested,
      failing: report.summary.failing,
      untested: report.summary.untested,
    },
    suite: {
      ok: run.ok,
      tests: run.tests.length,
      note: run.note ?? null,
    },
    criteria: report.criteria.map((c) => ({
      id: c.id,
      description: c.description,
      state: c.state,
      tests: c.matchedTests.map((t) => {
        const out: Record<string, unknown> = { name: t.name, status: t.status };
        if (t.file != null) out.file = t.file;
        if (t.duration != null) out.duration = t.duration;
        return out;
      }),
    })),
  };
}

/** `status --json`: the coverage report as a JSON string (no gate verdict). */
export function formatStatusJson(
  report: CoverageReport,
  run: TestRunResult,
  meta: JsonMeta,
): string {
  return JSON.stringify(coverageJsonBase('status', report, run, meta), null, 2);
}

/** `check --json`: the coverage report plus the gate verdict and problems. */
export function formatCheckJson(
  result: CheckResult,
  run: TestRunResult,
  meta: JsonMeta,
): string {
  const base = coverageJsonBase('check', result.report, run, meta);
  // `check` owns the authoritative verdict (it also fails on an unmapped red
  // suite), so override `ok` with the gate result and attach its reasons.
  base.ok = result.ok;
  base.problems = result.problems;
  return JSON.stringify(base, null, 2);
}

/** A JSON error object for `--json` mode when coverage can't be computed. */
export function formatJsonError(command: 'check' | 'status', message: string): string {
  return JSON.stringify(
    { schemaVersion: JSON_SCHEMA_VERSION, tool: 'speclock', command, ok: false, error: message },
    null,
    2,
  );
}
