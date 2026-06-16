/**
 * Parser for the Jest-compatible JSON test report — pure.
 *
 * Vitest's `--reporter=json` deliberately emits the same shape Jest's `--json`
 * does, so both adapters share this normalizer. It turns the report's nested
 * `testResults[].assertionResults[]` into a flat, runner-agnostic
 * `TestRunResult`. Exported and pure so it is unit-tested without spawning a
 * process.
 */

import type { TestCaseResult, TestRunResult, TestStatus } from '../core/types.js';
import { AdapterError } from './types.js';

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function normalizeStatus(status: unknown): TestStatus {
  if (status === 'passed') return 'passed';
  if (status === 'failed') return 'failed';
  // skipped, pending, todo, disabled, etc. all count as "not run / skipped".
  return 'skipped';
}

function firstLine(s: string): string {
  const line = (s.split('\n')[0] ?? '').trim();
  return line.length > 200 ? `${line.slice(0, 197)}…` : line;
}

/** Normalize a Jest-compatible JSON report into a TestRunResult. Pure. */
export function parseJestStyleReport(report: unknown): TestRunResult {
  const root = asRecord(report);
  if (!root) {
    throw new AdapterError('Test report was empty or not a JSON object.');
  }

  const tests: TestCaseResult[] = [];
  const loadFailures: string[] = [];
  for (const fileRaw of asArray(root.testResults)) {
    const file = asRecord(fileRaw);
    if (!file) continue;
    const filePath = asString(file.name);
    const before = tests.length;
    for (const aRaw of asArray(file.assertionResults)) {
      const a = asRecord(aRaw);
      if (!a) continue;
      const title = asString(a.title) ?? '';
      const ancestors = asArray(a.ancestorTitles)
        .map(asString)
        .filter((s): s is string => s != null);
      const full = asString(a.fullName);
      const name = (full && full.trim() ? full : [...ancestors, title].join(' ')).trim();
      const duration = asNumber(a.duration);
      const test: TestCaseResult = { name, status: normalizeStatus(a.status) };
      if (filePath) test.file = filePath;
      if (duration != null) test.duration = duration;
      tests.push(test);
    }
    // A file that failed to load/collect reports zero assertions but a failed
    // status and a message. Surface it as a failing test + diagnostic note so
    // the real cause (import/compile error) isn't silently swallowed.
    if (tests.length === before && asString(file.status) === 'failed') {
      const label = filePath ? `${filePath} (failed to load)` : 'a test file (failed to load)';
      const synth: TestCaseResult = { name: label, status: 'failed' };
      if (filePath) synth.file = filePath;
      tests.push(synth);
      const msg = asString(file.message);
      if (msg && msg.trim()) loadFailures.push(msg.trim());
    }
  }

  const anyFailed = tests.some((t) => t.status === 'failed');
  const success = typeof root.success === 'boolean' ? root.success : undefined;
  const ok = success != null ? success && !anyFailed : !anyFailed;

  const result: TestRunResult = { ok, tests };
  if (loadFailures.length > 0) {
    result.note = `a test file failed to load: ${firstLine(loadFailures[0]!)}`;
  } else if (!ok && tests.length === 0) {
    result.note = 'no tests were reported';
  }
  return result;
}
