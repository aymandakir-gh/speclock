import { describe, it, expect } from 'vitest';
import { runJsonReporter } from '../../src/adapters/run-json.js';
import { spawnProcess, MAX_CAPTURED_BYTES } from '../../src/adapters/spawn.js';
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

  // A chatty/looping runner must not be able to grow the diagnostic buffer
  // without bound and OOM speclock. Output is capped at MAX_CAPTURED_BYTES; the
  // head is kept and a single truncation marker is appended.
  it('[SL-6] caps captured stdout from a very chatty child', async () => {
    // Write ~3MB, draining via the write callback so nothing is dropped by the
    // OS pipe before the child exits.
    const childCode = `
      let written = 0;
      const chunk = 'x'.repeat(64 * 1024);
      function pump() {
        if (written >= 3 * 1024 * 1024) { process.exit(0); return; }
        written += chunk.length;
        process.stdout.write(chunk, pump);
      }
      pump();
    `;
    const res = await spawnProcess(process.execPath, ['-e', childCode], {
      cwd: process.cwd(),
      timeoutMs: 15_000,
    });
    expect(res.code).toBe(0);
    expect(res.stdout.length).toBeLessThan(MAX_CAPTURED_BYTES + 64 * 1024);
    expect(res.stdout.endsWith('…(truncated)')).toBe(true);
    // The head is preserved (all 'x' before the marker).
    expect(res.stdout.startsWith('x'.repeat(1000))).toBe(true);
  });
});
