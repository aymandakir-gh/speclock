/**
 * Parser for JUnit XML test reports (as emitted by `pytest --junit-xml`) — pure.
 *
 * JUnit XML is small and regular: a tree of `<testcase>` elements, each passing
 * unless it contains a `<failure>`/`<error>` (failed) or `<skipped>` (skipped)
 * child. We scan for `<testcase>` elements rather than building a full DOM, so
 * there are no dependencies. Exported and pure so it is unit-tested directly.
 *
 * Note: like any attribute-regex XML reader, this assumes well-formed runner
 * output and that test names don't contain a raw `>` (pytest escapes it). That
 * holds for `pytest --junit-xml`.
 */

import type { TestCaseResult, TestRunResult, TestStatus } from '../core/types.js';
import { AdapterError } from './types.js';

/** Decode the XML entities that can appear in attribute values. */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    // Ampersand last so we don't double-decode (e.g. "&amp;lt;" -> "&lt;").
    .replace(/&amp;/g, '&');
}

/** Parse `key="value"` / `key='value'` attribute pairs from a tag's attr text. */
function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    out[m[1]!] = decodeEntities(m[2] ?? m[3] ?? '');
  }
  return out;
}

/** Normalize a JUnit XML report into a TestRunResult. Pure. */
export function parseJUnitXml(xml: string): TestRunResult {
  if (typeof xml !== 'string' || xml.trim() === '') {
    throw new AdapterError('JUnit XML report was empty.');
  }

  const tests: TestCaseResult[] = [];
  // `\b` after "testcase" keeps this from matching <testsuite>. The attrs group
  // is non-greedy, then either a self-closing `/>` or a `>…</testcase>` body.
  const caseRe = /<testcase\b([\s\S]*?)(?:\/>|>([\s\S]*?)<\/testcase>)/g;
  let m: RegExpExecArray | null;
  while ((m = caseRe.exec(xml)) !== null) {
    const attrs = parseAttrs(m[1] ?? '');
    const body = m[2] ?? '';
    const cls = attrs.classname ?? '';
    const nm = attrs.name ?? '';
    const name = cls && nm ? `${cls}::${nm}` : nm || cls || '(unnamed test)';

    let status: TestStatus = 'passed';
    if (/<(failure|error)\b/.test(body)) status = 'failed';
    else if (/<skipped\b/.test(body)) status = 'skipped';

    const test: TestCaseResult = { name, status };
    if (cls) test.file = cls;
    const seconds = attrs.time != null ? Number(attrs.time) : NaN;
    if (Number.isFinite(seconds)) test.duration = Math.round(seconds * 1000);
    tests.push(test);
  }

  const ok = !tests.some((t) => t.status === 'failed');
  const result: TestRunResult = { ok, tests };
  if (!ok && tests.length === 0) {
    result.note = 'no tests were reported';
  }
  return result;
}
