import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { parseVitestReport, vitestAdapter } from '../../src/adapters/vitest.js';
import { AdapterError } from '../../src/adapters/types.js';

describe('parseVitestReport', () => {
  const sample = {
    success: false,
    testResults: [
      {
        name: '/proj/a.test.ts',
        assertionResults: [
          { ancestorTitles: ['suite'], title: '[AC-1] passes', fullName: 'suite [AC-1] passes', status: 'passed', duration: 3 },
          { ancestorTitles: ['suite'], title: '[AC-2] fails', fullName: 'suite [AC-2] fails', status: 'failed' },
          { ancestorTitles: ['suite'], title: '[AC-3] todo', fullName: 'suite [AC-3] todo', status: 'todo' },
        ],
      },
    ],
  };

  it('[SL-6] normalizes statuses, names, files and duration', () => {
    const r = parseVitestReport(sample);
    expect(r.tests).toEqual([
      { name: 'suite [AC-1] passes', status: 'passed', file: '/proj/a.test.ts', duration: 3 },
      { name: 'suite [AC-2] fails', status: 'failed', file: '/proj/a.test.ts' },
      { name: 'suite [AC-3] todo', status: 'skipped', file: '/proj/a.test.ts' },
    ]);
    expect(r.ok).toBe(false);
  });

  it('[SL-6] reports ok when success is true and nothing failed', () => {
    expect(parseVitestReport({ success: true, testResults: [] }).ok).toBe(true);
  });

  it('[SL-6] builds a name from ancestorTitles + title when fullName is absent', () => {
    const r = parseVitestReport({
      testResults: [{ assertionResults: [{ ancestorTitles: ['a', 'b'], title: 'c', status: 'passed' }] }],
    });
    expect(r.tests[0]!.name).toBe('a b c');
  });

  it('[SL-6] throws AdapterError on a non-object report', () => {
    expect(() => parseVitestReport(null)).toThrow(AdapterError);
  });

  it('[SL-6] surfaces a file that failed to load as a failing test + note', () => {
    const r = parseVitestReport({
      success: false,
      testResults: [
        {
          name: '/proj/broken.test.ts',
          status: 'failed',
          message: 'Failed to load url ./missing.js\nDoes the file exist?',
          assertionResults: [],
        },
      ],
    });
    expect(r.ok).toBe(false);
    expect(r.tests).toHaveLength(1);
    expect(r.tests[0]!.status).toBe('failed');
    expect(r.tests[0]!.name).toContain('broken.test.ts');
    expect(r.note).toContain('Failed to load url');
  });
});

describe('vitestAdapter.run (integration)', () => {
  const fixtureDir = fileURLToPath(new URL('../fixtures/sample-vitest-project/', import.meta.url));
  const fixtureConfig = fileURLToPath(
    new URL('../fixtures/sample-vitest-project/vitest.config.ts', import.meta.url),
  );

  it(
    '[SL-6] runs a real Vitest suite and reports pass/fail/skip',
    async () => {
      const r = await vitestAdapter.run({
        cwd: fixtureDir,
        configPath: fixtureConfig,
        timeoutMs: 60_000,
      });
      const find = (frag: string) => r.tests.find((x) => x.name.includes(frag));
      expect(find('PASS-1')?.status).toBe('passed');
      expect(find('FAIL-1')?.status).toBe('failed');
      expect(find('SKIP-1')?.status).toBe('skipped');
      expect(r.ok).toBe(false);
    },
    60_000,
  );
});
