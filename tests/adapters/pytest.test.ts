import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseJUnitXml } from '../../src/adapters/junit.js';
import { pytestAdapter, pytestCommand } from '../../src/adapters/pytest.js';
import { getAdapter, adapterNames } from '../../src/adapters/index.js';
import { AdapterError } from '../../src/adapters/types.js';

const PASS_FAIL_SKIP = `<?xml version="1.0" encoding="utf-8"?>
<testsuites name="pytest tests"><testsuite name="pytest" errors="0" failures="1" skipped="1" tests="3" time="0.011">
<testcase classname="test_sample" name="test_pass_1" time="0.012" />
<testcase classname="test_sample" name="test_fail_1" time="0.001"><failure message="assert 1 == 2">E   assert 1 == 2</failure></testcase>
<testcase classname="test_sample" name="test_skip_1" time="0.000"><skipped type="pytest.skip" message="demo skip">...skip...</skipped></testcase>
</testsuite></testsuites>`;

describe('parseJUnitXml', () => {
  it('[SL-11] normalizes pass/fail/skip and builds classname::name with ms duration', () => {
    const r = parseJUnitXml(PASS_FAIL_SKIP);
    expect(r.tests).toEqual([
      { name: 'test_sample::test_pass_1', status: 'passed', file: 'test_sample', duration: 12 },
      { name: 'test_sample::test_fail_1', status: 'failed', file: 'test_sample', duration: 1 },
      { name: 'test_sample::test_skip_1', status: 'skipped', file: 'test_sample', duration: 0 },
    ]);
    expect(r.ok).toBe(false);
  });

  it('[SL-11] treats a <error> child as a failed test', () => {
    const xml = `<testsuite><testcase classname="m" name="t"><error message="boom">trace</error></testcase></testsuite>`;
    const r = parseJUnitXml(xml);
    expect(r.tests[0]!.status).toBe('failed');
    expect(r.ok).toBe(false);
  });

  it('[SL-11] an empty suite (no testcases) is ok with zero tests', () => {
    const r = parseJUnitXml('<testsuites name="pytest tests"><testsuite name="pytest" tests="0" /></testsuites>');
    expect(r.tests).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('[SL-11] decodes XML entities in test names', () => {
    const xml = `<testsuite><testcase classname="m" name="test x &lt;1&gt; &amp; y" /></testsuite>`;
    expect(parseJUnitXml(xml).tests[0]!.name).toBe('m::test x <1> & y');
  });

  it('[SL-11] throws AdapterError on empty input', () => {
    expect(() => parseJUnitXml('')).toThrow(AdapterError);
    expect(() => parseJUnitXml('   ')).toThrow(/empty/);
  });

  it('[SL-11] aggregates testcases across multiple <testsuite> elements', () => {
    const xml = `<testsuites>
      <testsuite name="a"><testcase classname="ma" name="t1" /></testsuite>
      <testsuite name="b"><testcase classname="mb" name="t2" /></testsuite>
    </testsuites>`;
    const r = parseJUnitXml(xml);
    expect(r.tests.map((t) => t.name)).toEqual(['ma::t1', 'mb::t2']);
    expect(r.ok).toBe(true);
  });

  it('[SL-11] omits duration when there is no time attribute, and parses single-quoted attrs', () => {
    const r = parseJUnitXml(`<testsuite><testcase classname='m' name='t' /></testsuite>`);
    expect(r.tests[0]).toEqual({ name: 'm::t', status: 'passed', file: 'm' });
  });

  it('[SL-11] uses just the name when there is no classname', () => {
    const r = parseJUnitXml(`<testsuite><testcase name="lonely" time="0.002" /></testsuite>`);
    expect(r.tests[0]).toEqual({ name: 'lonely', status: 'passed', duration: 2 });
  });

  it('[SL-11] the pytest adapter is registered and selectable by name', () => {
    expect(getAdapter('pytest')).toBe(pytestAdapter);
    expect(adapterNames()).toContain('pytest');
  });
});

describe('pytestCommand', () => {
  it('[SL-11] defaults to the `pytest` binary', () => {
    expect(pytestCommand({})).toEqual({ cmd: 'pytest', baseArgs: [] });
  });

  it('[SL-11] honors the SPECLOCK_PYTEST override, splitting command and args', () => {
    expect(pytestCommand({ SPECLOCK_PYTEST: 'python -m pytest' })).toEqual({
      cmd: 'python',
      baseArgs: ['-m', 'pytest'],
    });
  });
});

function pytestAvailable(): boolean {
  try {
    execFileSync('pytest', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
const HAS_PYTEST = pytestAvailable();

// Untagged on purpose: where pytest isn't installed (e.g. the node-only CI jobs)
// this skips, and a skipped test must not flip SL-11 to "failing". SL-11 is
// covered by the pure-parser tests above and proven end-to-end by the CI
// `examples` job (which sets up Python).
describe('pytestAdapter.run (integration)', () => {
  const fixtureDir = fileURLToPath(new URL('../fixtures/sample-pytest-project/', import.meta.url));

  it.skipIf(!HAS_PYTEST)(
    'runs a real pytest suite and reports pass/fail/skip',
    async () => {
      const r = await pytestAdapter.run({ cwd: fixtureDir, timeoutMs: 60_000 });
      const find = (frag: string) => r.tests.find((x) => x.name.includes(frag));
      expect(find('pass_1')?.status).toBe('passed');
      expect(find('fail_1')?.status).toBe('failed');
      expect(find('skip_1')?.status).toBe('skipped');
      expect(r.ok).toBe(false);
    },
    60_000,
  );
});
