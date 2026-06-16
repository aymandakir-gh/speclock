import { describe, it, expect } from 'vitest';
import { runJsonReporter } from '../../src/adapters/run-json.js';
import { spawnProcess } from '../../src/adapters/spawn.js';
import { parseJestStyleReport } from '../../src/adapters/jest-report.js';
import { AdapterError } from '../../src/adapters/types.js';

// Underpins the Vitest/Jest adapters. Regression for review #11: an empty/
// zero-match suite (runner exits 0, writes no report) must be an empty result,
// not a crash classified as a config error.
describe('runJsonReporter empty-suite handling', () => {
  it('[SL-6] treats a clean exit (0) with no report as an empty suite', async () => {
    const r = await runJsonReporter({
      bin: process.execPath,
      cwd: process.cwd(),
      timeoutMs: 15_000,
      label: 'fake',
      buildArgs: () => ['-e', 'process.exit(0)'], // writes no report file
      parse: parseJestStyleReport,
    });
    expect(r).toEqual({ ok: true, tests: [] });
  });

  it('[SL-6] still throws when the runner fails (non-zero) without a report', async () => {
    await expect(
      runJsonReporter({
        bin: process.execPath,
        cwd: process.cwd(),
        timeoutMs: 15_000,
        label: 'fake',
        buildArgs: () => ['-e', 'process.exit(3)'],
        parse: parseJestStyleReport,
      }),
    ).rejects.toThrow(AdapterError);
  });
});

describe('spawnProcess', () => {
  it('[SL-6] captures stdout and the exit code of a child process', async () => {
    const res = await spawnProcess(
      process.execPath,
      ['-e', 'process.stdout.write("hi")'],
      { cwd: process.cwd(), timeoutMs: 15_000 },
    );
    expect(res.code).toBe(0);
    expect(res.stdout).toBe('hi');
    expect(res.timedOut).toBe(false);
  });
});
