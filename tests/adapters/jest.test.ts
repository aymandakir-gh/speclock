import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { parseJestReport, jestAdapter } from '../../src/adapters/jest.js';
import { getAdapter, adapterNames } from '../../src/adapters/index.js';
import { AdapterError } from '../../src/adapters/types.js';

// The generic Jest-compatible JSON shape is covered by vitest.test.ts (same pure
// parser). These tests pin Jest-specific vocabulary and the real Jest run.
describe('parseJestReport', () => {
  it('[SL-10] maps Jest "pending" (test.skip) and "todo" to skipped', () => {
    const r = parseJestReport({
      success: true,
      testResults: [
        {
          name: '/p/a.test.js',
          assertionResults: [
            { fullName: 'g [JD-1] ok', status: 'passed', duration: 2 },
            { fullName: 'g [JD-2] later', status: 'pending', duration: null },
            { fullName: 'g [JD-3] todo', status: 'todo' },
          ],
        },
      ],
    });
    expect(r.tests.map((t) => t.status)).toEqual(['passed', 'skipped', 'skipped']);
    // A null duration is dropped rather than recorded as a number.
    expect(r.tests[1]!.duration).toBeUndefined();
    expect(r.ok).toBe(true);
  });

  it('[SL-10] is not ok when the report has a failed test', () => {
    const r = parseJestReport({
      success: false,
      testResults: [
        { name: '/p/a.test.js', assertionResults: [{ fullName: 'x', status: 'failed' }] },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it('[SL-10] surfaces a Jest suite that failed to load as a failing test + note', () => {
    const r = parseJestReport({
      success: false,
      testResults: [
        {
          name: '/p/broken.test.js',
          status: 'failed',
          message: 'Cannot find module ./missing from broken.test.js',
          assertionResults: [],
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.tests).toHaveLength(1);
    expect(r.tests[0]!.status).toBe('failed');
    expect(r.tests[0]!.name).toContain('broken.test.js');
    expect(r.note).toContain('Cannot find module');
  });

  it('[SL-10] throws AdapterError on a non-object report', () => {
    expect(() => parseJestReport(42)).toThrow(AdapterError);
  });

  it('[SL-10] the jest adapter is registered and selectable by name', () => {
    expect(getAdapter('jest')).toBe(jestAdapter);
    expect(adapterNames()).toContain('jest');
  });
});

describe('jestAdapter.run (integration)', () => {
  const fixtureDir = fileURLToPath(new URL('../fixtures/sample-jest-project/', import.meta.url));

  it(
    '[SL-10] runs a real Jest suite and reports pass/fail/skip',
    async () => {
      const r = await jestAdapter.run({ cwd: fixtureDir, timeoutMs: 60_000 });
      const find = (frag: string) => r.tests.find((x) => x.name.includes(frag));
      expect(find('PASS-1')?.status).toBe('passed');
      expect(find('FAIL-1')?.status).toBe('failed');
      expect(find('SKIP-1')?.status).toBe('skipped');
      expect(r.ok).toBe(false);
    },
    60_000,
  );
});
